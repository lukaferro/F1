import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { JolpicaService, JolpicaDriverInfo } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { DriversStateService } from '../../services/drivers-state.service';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { DriverComparisonComponent } from '../driver-comparison/driver-comparison.component';
import { currentSeasonPhotoUrl, hiResHeadshotUrl, previousSeasonPhotoUrl } from '../../utils/f1-media';
import { TEAM_COLORS } from '../../utils/team-colors';
import { constructorColor } from '../../utils/constructor-branding';
import { flagUrl } from '../../utils/country-flags';
import { nationalityToCountryCode } from '../../utils/nationality';

interface YearOption {
  label: string;
  value: number | null;
}

export interface HistoricCard {
  driverId: string;
  name: string;
  team?: string;
  color: string; // color senza '#'
  badge?: string; // 'P3' nelle stagioni, assente nella ricerca
  flag?: string; // solo nella ricerca senza anno
  photo?: string;
  initials: string;
  link: string[];
}

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    ApiUnavailableComponent,
    DriverComparisonComponent
  ],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);
  private readonly jolpicaService = inject(JolpicaService);
  private readonly wikipediaService = inject(WikipediaService);
  private readonly stateService = inject(DriversStateService);
  private readonly excludedDrivers = new Set<string>(['FELIPE DRUGOVICH']);

  drivers: Driver[] = [];
  allDrivers: Map<number, Driver[]> = new Map(); // Map<year, drivers[]>
  filteredDrivers: Driver[] = [];
  historicCards: HistoricCard[] | null = null;
  searchLimited = false;
  loading = false;
  error?: string;
  errorSource: 'openf1' | 'jolpica' = 'openf1';
  showComparison = false;

  years: YearOption[] = [];
  selectedYear: number | null = null;
  searchQuery: string = '';

  private allHistoricDrivers?: JolpicaDriverInfo[];
  private filterSeq = 0;
  private loadRemainingYearsPromise?: Promise<any>;
  private readonly racesByYear = new Map<number, number[]>();

  // Colori di riserva dei team (stessi usati in gran-premi-detail)
  readonly teamColors = TEAM_COLORS;

  // Mappa dei piloti con foto ufficiali da Formula1.com (chiavi in MAIUSCOLO "Nome Cognome")
  private readonly driverPhotos: { [key: string]: string } = {
    'MAX VERSTAPPEN': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS92ZXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'SERGIO PEREZ': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMi9kcml2ZXJzL2hlYWRzaG90cy9mMS9wZXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'GEORGE RUSSELL': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/george-russell.png?im=Resize,width=270',
    'CHARLES LECLERC': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9sZWMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'CARLOS SAINZ': 'https://cdn.williamsf1.tech/images/fnx611yr/production/6971f174c05a7f0397e2cbe32cd42ab0255f2dce-3136x3135.png?rect=1,0,3135,3135&w=625&h=625&auto=format',
    'LANDO NORRIS': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9ub3IucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'OSCAR PIASTRI': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9waWEucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'FERNANDO ALONSO': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9hbG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LANCE STROLL': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9zdHIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'ESTEBAN OCON': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/esteban-ocon.png?im=Resize,width=270',
    'PIERRE GASLY': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9nYXMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'YUKI TSUNODA': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/yuki-tsunoda.png?im=Resize,width=270',
    'DANIEL RICCIARDO': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9yaWMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'VALTTERI BOTTAS': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9ib3QucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'GUANYU ZHOU': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS96aG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'KEVIN MAGNUSSEN': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9tYWcucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'NICO HULKENBERG': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/nico-hulkenberg.png?im=Resize,width=270',
    'ALEXANDER ALBON': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9hbGIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LOGAN SARGEANT': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9zYXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'OLIVER BEARMAN': 'https://www.olliebearman.com/media/pages/home/b4d938add1-1740818186/about-home-1200x.webp',
    'FRANCO COLAPINTO': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/franco-colapinto.png?im=Resize,width=270',
    'ANDREA KIMI ANTONELLI': 'https://images.ctfassets.net/1fvlg6xqnm65/5YiTw6xQHuM94ty9yLDnyk/ff67d40c690940307f48d1b370352577/Kimi_Antonelli.png',
    'ISACK HADJAR': 'https://soymotor.com/sites/default/files/2025-03/ihadjar_2025.png',
    'NYCK DE VRIES': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9kZXYucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LIAM LAWSON': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/liam-lawson.png?im=Resize,width=270'
  };

  async ngOnInit() {
    this.selectedYear = this.stateService.selectedYear;
    this.searchQuery = this.stateService.searchQuery;
    await this.loadAllDrivers();
  }

  toggleComparison(): void {
    this.showComparison = !this.showComparison;
  }

  // Foto ufficiali ad alta risoluzione dei piloti della griglia attuale (chiave: nome completo in maiuscolo)
  private readonly currentPhotos = new Map<string, string>();

  private photoKey(driver: Driver): string {
    return (driver.full_name || `${driver.first_name} ${driver.last_name}`).toUpperCase().trim();
  }

  private async loadCurrentPhotos(): Promise<void> {
    try {
      for (const driver of await this.openF1Service.getLatestDrivers()) {
        const url = currentSeasonPhotoUrl(driver);
        if (url) this.currentPhotos.set(this.photoKey(driver), url);
      }
    } catch {
      // Senza griglia attuale usiamo le foto di OpenF1
    }
  }

  private isExcluded(driver: Driver): boolean {
    const name = (driver.full_name || '').toUpperCase();
    return this.excludedDrivers.has(name);
  }

  private async loadYearDrivers(year: number, sessionKeys: number[]): Promise<Driver[]> {
    if (this.allDrivers.has(year)) {
      return this.allDrivers.get(year)!;
    }
    const keys = [...new Set([sessionKeys[0], sessionKeys[sessionKeys.length - 1]])];
    const lists = await Promise.all(keys.map(k => this.openF1Service.getDrivers(k, 'session').catch(() => [] as Driver[])));

    const byName = new Map<string, Driver>();
    for (const driver of lists.flat()) {
      if (this.isExcluded(driver)) continue;
      byName.set(this.photoKey(driver), {
        ...driver,
        team_color: driver.team_color || this.teamColors[driver.team_name] || 'FFFFFF'
      });
    }

    const result = byName.size ? [...byName.values()].sort((a, b) => a.driver_number - b.driver_number) : [];
    if (result.length) {
      this.allDrivers.set(year, result);
    }
    return result;
  }

  async loadAllDrivers() {
    this.loading = true;
    this.error = undefined;
    this.errorSource = 'openf1';

    try {
      // Tutte le gare di tutte le stagioni, stagioni Jolpica e griglia attuale in parallelo
      const [races, jolpicaSeasons] = await Promise.all([
        this.openF1Service.getRaceSessions(),
        this.jolpicaService.getSeasons().catch(() => [] as number[]),
        this.loadCurrentPhotos()
      ]);

      // Gare già corse, raggruppate per stagione in ordine di data
      const now = Date.now();
      this.racesByYear.clear();
      [...races]
        .filter(r => !r.is_cancelled && new Date(r.date_end).getTime() < now)
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
        .forEach(r => {
          const year = r.year ?? new Date(r.date_start).getFullYear();
          if (!this.racesByYear.has(year)) this.racesByYear.set(year, []);
          this.racesByYear.get(year)!.push(r.session_key);
        });

      // Popola subito gli anni disponibili per il dropdown
      this.populateYears(jolpicaSeasons);

      // Carica prima di tutto i piloti della stagione più recente
      const latestYear = this.racesByYear.size ? Math.max(...this.racesByYear.keys()) : undefined;
      if (latestYear && this.racesByYear.has(latestYear)) {
        await this.loadYearDrivers(latestYear, this.racesByYear.get(latestYear)!);
      }

      // Se era selezionato un anno OpenF1 specifico diverso dal più recente, carichiamo subito i suoi piloti
      if (this.selectedYear && this.selectedYear >= 2023 && this.racesByYear.has(this.selectedYear) && this.selectedYear !== latestYear) {
        await this.loadYearDrivers(this.selectedYear, this.racesByYear.get(this.selectedYear)!);
      }

      // Se non ci sono gare o sono fallite, tenta il fallback da getLatestDrivers
      if (this.allDrivers.size === 0) {
        try {
          const latest = await this.openF1Service.getLatestDrivers();
          if (latest.length) {
            const currentYear = new Date().getFullYear();
            const valid = latest.filter(d => !this.isExcluded(d)).map(d => ({
              ...d,
              team_color: d.team_color || this.teamColors[d.team_name] || 'FFFFFF'
            }));
            this.allDrivers.set(currentYear, valid);
          }
        } catch {
          // Ignora fallback se non disponibile
        }
      }

      // Nessun pilota caricato perché l'API non risponde: mostriamo l'avviso
      if (this.allDrivers.size === 0 && this.openF1Service.apiStatus() === 'error') {
        throw new Error('API OpenF1 non disponibile');
      }

      // Mostra subito i piloti della stagione più recente
      await this.applyFilters();
      this.loading = false;

      // In background carica in parallelo le altre stagioni OpenF1 senza bloccare l'interfaccia
      const remainingYears = [...this.racesByYear.entries()].filter(([y]) => y !== latestYear);
      this.loadRemainingYearsPromise = Promise.all(
        remainingYears.map(([y, keys]) => this.loadYearDrivers(y, keys))
      );
    } catch (err: any) {
      this.error = err?.message || 'Errore caricamento piloti';
      this.errorSource = 'openf1';
      this.loading = false;
    }
  }

  private populateYears(jolpicaYears: number[] = []) {
    const openF1Years = Array.from(new Set([...this.racesByYear.keys(), ...this.allDrivers.keys()]));
    const allYears = Array.from(new Set([...openF1Years, ...jolpicaYears]));
    const latestYear = allYears.length ? Math.max(...allYears) : new Date().getFullYear();
    const pastYears = allYears.filter(y => y !== latestYear).sort((a, b) => b - a);

    this.years = [
      { label: 'Stagione attuale', value: null },
      ...pastYears.map(year => ({
        label: year.toString(),
        value: year
      }))
    ];
  }

  private saveState() {
    this.stateService.selectedYear = this.selectedYear;
    this.stateService.searchQuery = this.searchQuery;
  }

  async onYearSelect(year: number | null) {
    this.selectedYear = year;
    this.saveState();
    await this.applyFilters();
  }

  async onSearch() {
    this.saveState();
    await this.applyFilters();
  }

  async resetFilters() {
    this.selectedYear = null;
    this.searchQuery = '';
    this.saveState();
    await this.applyFilters();
  }

  async retryLoad(): Promise<void> {
    if ((this.selectedYear && this.selectedYear < 2023) || (!this.selectedYear && this.searchQuery.trim())) {
      await this.applyFilters();
    } else {
      await this.loadAllDrivers();
    }
  }

  private async applyFilters() {
    const seq = ++this.filterSeq;
    this.error = undefined;
    this.searchLimited = false;

    // Caso 1: Anno storico (< 2023) tramite archivio Jolpica
    if (this.selectedYear && this.selectedYear < 2023) {
      this.loading = true;
      try {
        const standings = await this.jolpicaService.getDriverStandings(this.selectedYear);
        if (seq !== this.filterSeq) return;

        const wikiTitles = standings.map(s => s.wikiTitle).filter((t): t is string => !!t);
        const images = await this.wikipediaService.getImages(wikiTitles);
        if (seq !== this.filterSeq) return;

        let cards: HistoricCard[] = standings.map(s => ({
          driverId: s.driverId,
          name: s.fullName,
          team: s.constructorName,
          color: constructorColor(s.constructorId),
          badge: 'P' + s.position,
          photo: s.wikiTitle ? images.get(s.wikiTitle) : undefined,
          initials: getInitials(s.fullName),
          link: ['/drivers', 'storico', s.driverId],
          flag: undefined
        }));

        if (this.searchQuery.trim()) {
          const q = plain(this.searchQuery);
          cards = cards.filter(c => plain(c.name).includes(q) || (c.team && plain(c.team).includes(q)));
        }

        this.historicCards = cards;
        this.drivers = [];
      } catch (err: any) {
        if (seq !== this.filterSeq) return;
        this.error = err?.message || 'Errore archivio storico Jolpica';
        this.errorSource = 'jolpica';
        this.historicCards = null;
      } finally {
        if (seq === this.filterSeq) {
          this.loading = false;
        }
      }
      return;
    }

    // Caso 2: Nessun anno selezionato ma con ricerca testuale -> cerca tra tutti i piloti dal 1950
    if (!this.selectedYear && this.searchQuery.trim()) {
      this.loading = true;
      try {
        if (this.loadRemainingYearsPromise) {
          await this.loadRemainingYearsPromise;
        }
        if (seq !== this.filterSeq) return;
        if (!this.allHistoricDrivers) {
          this.allHistoricDrivers = await this.jolpicaService.getAllDrivers();
        }
        if (seq !== this.filterSeq) return;

        const query = plain(this.searchQuery);
        const matched = this.allHistoricDrivers.filter(d => plain(d.fullName).includes(query));

        // Ordinamento alfabetico per cognome
        matched.sort((a, b) =>
          (a.familyName || '').localeCompare(b.familyName || '', 'it') ||
          (a.givenName || '').localeCompare(b.givenName || '', 'it')
        );

        this.searchLimited = matched.length > 48;
        const top = matched.slice(0, 48);

        const titles = top.map(d => d.wikiTitle).filter((t): t is string => !!t);
        const images = await this.wikipediaService.getImages(titles);
        if (seq !== this.filterSeq) return;

        const cards: HistoricCard[] = top.map(d => {
          const openF1Match = this.findOpenF1Driver(d);
          const link = openF1Match ? ['/drivers', openF1Match.name_acronym || openF1Match.driver_number.toString()] : ['/drivers', 'storico', d.driverId];
          const countryCode = d.nationality ? nationalityToCountryCode(d.nationality) : undefined;
          return {
            driverId: d.driverId,
            name: d.fullName,
            team: undefined,
            color: '555555',
            badge: undefined,
            flag: flagUrl(countryCode) || undefined,
            photo: d.wikiTitle ? images.get(d.wikiTitle) : undefined,
            initials: getInitials(d.fullName),
            link
          };
        });

        this.historicCards = cards;
        this.drivers = [];
      } catch (err: any) {
        if (seq !== this.filterSeq) return;
        this.error = err?.message || 'Errore archivio storico Jolpica';
        this.errorSource = 'jolpica';
        this.historicCards = null;
      } finally {
        if (seq === this.filterSeq) {
          this.loading = false;
        }
      }
      return;
    }

    // Caso 3: Anno OpenF1 selezionato (>= 2023) o vista iniziale senza filtri
    if (this.selectedYear && this.selectedYear >= 2023 && !this.allDrivers.has(this.selectedYear) && this.racesByYear.has(this.selectedYear)) {
      this.loading = true;
      try {
        await this.loadYearDrivers(this.selectedYear, this.racesByYear.get(this.selectedYear)!);
      } finally {
        if (seq === this.filterSeq) {
          this.loading = false;
        }
      }
      if (seq !== this.filterSeq) return;
    }

    this.historicCards = null;
    let result: Driver[] = [];

    if (this.selectedYear) {
      // Mostra solo i piloti dell'anno selezionato
      const yearDrivers = this.allDrivers.get(this.selectedYear) || [];
      result = yearDrivers.map(driver => ({ ...driver }));
    } else {
      // Senza anno e senza ricerca: mostra solo la griglia dell'anno più recente con i loro colori
      const latestYear = this.allDrivers.size ? Math.max(...this.allDrivers.keys()) : undefined;
      const latestDrivers = latestYear ? (this.allDrivers.get(latestYear) || []) : [];
      result = latestDrivers.map(driver => ({ ...driver }));
    }

    // Applica ricerca sulle card OpenF1
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(driver =>
        driver.full_name.toLowerCase().includes(query) ||
        driver.broadcast_name.toLowerCase().includes(query) ||
        driver.name_acronym.toLowerCase().includes(query) ||
        driver.driver_number.toString().includes(query)
      );
    }

    this.filteredDrivers = result;
    this.drivers = result;
  }

  private findOpenF1Driver(historic: JolpicaDriverInfo): Driver | undefined {
    if (!historic.code) return undefined;
    const code = historic.code.toUpperCase();
    for (const list of this.allDrivers.values()) {
      const match = list.find(d => {
        if (d.name_acronym?.toUpperCase() !== code) return false;
        const dName = plain(d.full_name || `${d.first_name} ${d.last_name}`);
        const hName = plain(historic.fullName);
        if (dName === hName) return true;
        const dLast = plain(d.last_name || '');
        const hLast = plain(historic.familyName || '');
        const dFirst = plain(d.first_name || '');
        const hFirst = plain(historic.givenName || '');
        if (dLast && hLast && dLast === hLast) {
          if (dFirst && hFirst) return dFirst === hFirst;
          return true;
        }
        return false;
      });
      if (match) return match;
    }
    return undefined;
  }

  getDriverImage(driver: Driver): string {
    // 1. Foto ufficiale ad alta risoluzione della stagione in corso
    const current = this.currentPhotos.get(this.photoKey(driver));
    if (current) return current;

    // 2. Foto di OpenF1 in versione grande
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    if (headshot) return headshot;

    // 3. Foto inserite a mano, poi avatar con le iniziali
    return this.driverPhotos[`${driver.first_name} ${driver.last_name}`.toUpperCase().trim()] || this.avatarUrl(driver);
  }

  private avatarUrl(driver: Driver): string {
    const teamColor = this.getTeamColor(driver);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name_acronym)}&size=800&background=${teamColor}&color=ffffff&bold=true&font-size=0.33&format=svg`;
  }

  // Se la foto non si carica passa alla successiva disponibile nella pipeline (anno precedente -> OpenF1 headshot -> avatar)
  onDriverImageError(event: Event, driver: Driver): void {
    const img = event.target as HTMLImageElement;
    const prevSeason = previousSeasonPhotoUrl(driver);
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    const avatar = this.avatarUrl(driver);
    if (prevSeason && img.src !== prevSeason && !img.src.includes(`/${new Date().getFullYear() - 1}/`)) {
      img.src = prevSeason;
    } else if (headshot && img.src !== headshot) {
      img.src = headshot;
    } else if (img.src !== avatar) {
      img.src = avatar;
    }
  }

  getTeamColor(driver: Driver): string {
    // Prova prima con team_color dall'API
    let color = driver.team_color ? driver.team_color.replace('#', '').toUpperCase() : null;

    // Se manca o è nero, usa il colore mappato
    if (!color || color === '000000' || color === '000') {
      color = driver.team_name ? (this.teamColors[driver.team_name] || '555555') : '555555';
    }

    return color;
  }

  getDriverImageWithTeamColor(driver: Driver): string {
    const teamColor = this.getTeamColor(driver).replace('#', '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&size=800&background=${teamColor}&color=fff&bold=true&font-size=0.35&format=svg`;
  }

  trackByDriverNumber = (index: number, driver: Driver): string =>
    this.photoKey(driver);

  trackByHistoricCard = (index: number, card: HistoricCard): string =>
    card.driverId;
}
