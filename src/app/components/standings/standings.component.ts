import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ConstructorStanding, DriverStanding, JolpicaService, SeasonRoundPoints } from '../../services/jolpica.service';
import { Driver, Openf1ServiceService } from '../../services/openf1-service';
import { WikipediaService } from '../../services/wikipedia.service';
import { StandingsStateService, StandingsTab } from '../../services/standings-state.service';
import { currentSeasonPhotoUrl } from '../../utils/f1-media';
import { constructorColor, ConstructorLogo, constructorLogo } from '../../utils/constructor-branding';
import {
  buildPointsProgressionChart,
  PointsProgressionChart,
  ProgressionContenderInput
} from '../../utils/points-progression-chart';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { HallOfFameComponent } from '../hall-of-fame/hall-of-fame.component';

// Prima stagione con dati OpenF1: da qui in poi esiste la pagina di dettaglio del pilota
const FIRST_OPENF1_SEASON = 2023;
// Anno di nascita del campionato costruttori
const FIRST_CONSTRUCTORS_SEASON = 1958;
// Oltre questo tempo di caricamento avvisiamo che le richieste sono in coda (limiti dell'API)
const SLOW_LOADING_MS = 3000;

// Nome del team in OpenF1 per ogni constructorId Jolpica: foto e colori OpenF1 si usano solo se
// la squadra coincide (fuori stagione la griglia OpenF1 può già essere quella dell'anno dopo)
const OPENF1_TEAMS: Record<string, string[]> = {
  mercedes: ['Mercedes'],
  ferrari: ['Ferrari'],
  mclaren: ['McLaren'],
  red_bull: ['Red Bull Racing'],
  rb: ['Racing Bulls', 'RB'],
  aston_martin: ['Aston Martin'],
  alpine: ['Alpine'],
  williams: ['Williams'],
  haas: ['Haas F1 Team'],
  sauber: ['Kick Sauber'],
  audi: ['Audi'],
  cadillac: ['Cadillac']
};

const isNotFound = (err: unknown) => err instanceof HttpErrorResponse && err.status === 404;

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [FormsModule, RouterLink, SelectModule, ApiUnavailableComponent, HallOfFameComponent],
  templateUrl: './standings.component.html',
  styleUrl: './standings.component.css'
})
export class StandingsComponent implements OnInit, OnDestroy {
  private readonly jolpica = inject(JolpicaService);
  private readonly openF1 = inject(Openf1ServiceService);
  private readonly wikipedia = inject(WikipediaService, { optional: true });
  private readonly stateService = inject(StandingsStateService);

  seasons: number[] = [];
  seasonOptions: { label: string; value: number }[] = [];
  selectedSeason: number | null = null;
  latestSeason: number | null = null;
  tab: StandingsTab = 'drivers';

  driverStandings: DriverStanding[] = [];
  constructorStandings: ConstructorStanding[] = [];
  // Righe della tabella (dalla 4ª posizione), calcolate una volta quando arrivano i dati
  driverRows: DriverStanding[] = [];
  constructorRows: ConstructorStanding[] = [];
  private constructorsLoadedFor: number | null = null;

  // Dati e stato del grafico "Andamento del Campionato (Evoluzione Punti)"
  seasonRounds: SeasonRoundPoints[] = [];
  chartLoading = false;
  chartTopLimit: 5 | 8 | 10 = 5;
  hoveredSeriesId: string | null = null;
  selectedRoundIndex: number | null = null;
  readonly hiddenSeriesIds = new Set<string>();
  private roundsLoadedFor: number | null = null;

  loading = true;
  slowLoading = false;
  private slowTimer?: ReturnType<typeof setTimeout>;
  // errori separati: caricamento iniziale, classifica piloti, classifica costruttori
  private initError = false;
  private driversError = false;
  private constructorsError = false;

  // Griglia attuale di OpenF1 (per sigla): foto e colori ufficiali della stagione in corso
  private readonly currentGrid = new Map<string, Driver>();
  // Foto dei piloti caricate da Wikipedia (per piloti storici, chiave: driverId)
  private readonly driverPhotos = new Map<string, string>();
  // Foto e loghi che non si sono caricati: al loro posto le iniziali
  private readonly failedPhotos = new Set<string>();
  private readonly failedLogos = new Set<string>();

  async ngOnInit(): Promise<void> {
    this.tab = this.stateService.tab;
    await this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.slowTimer);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.initError = false;
    try {
      const [seasons, latest] = await Promise.all([this.jolpica.getSeasons(), this.jolpica.getLatestSeasonWithStandings()]);
      this.seasons = seasons;
      this.seasonOptions = seasons.map(year => ({ label: String(year), value: year }));
      this.latestSeason = latest;
      this.loadCurrentGrid();
      const targetSeason = this.stateService.selectedSeason ?? latest;
      await this.selectSeason(targetSeason);
    } catch {
      this.initError = true;
      this.loading = false;
    }
  }

  /** "Riprova" ripete solo ciò che è fallito, senza cambiare stagione o tab */
  async retry(): Promise<void> {
    if (this.initError || this.selectedSeason === null) return this.load();
    if (this.tab === 'constructors' && this.constructorsError && !this.driversError) {
      return this.withLoading(this.selectedSeason, () => this.fetchConstructors(this.selectedSeason!));
    }
    return this.selectSeason(this.selectedSeason);
  }

  async selectSeason(year: number): Promise<void> {
    this.selectedSeason = year;
    this.stateService.selectedSeason = year;
    this.setDrivers([]);
    this.setConstructors([]);
    this.constructorsLoadedFor = null;
    this.driversError = false;
    this.constructorsError = false;
    this.seasonRounds = [];
    this.roundsLoadedFor = null;
    this.hiddenSeriesIds.clear();
    this.hoveredSeriesId = null;
    this.selectedRoundIndex = null;

    // Carica in background i risultati round-by-round per il grafico evoluzione punti
    void this.fetchSeasonRounds(year);

    // Piloti e (se il tab è aperto) costruttori sono indipendenti: un errore non blocca l'altro
    await this.withLoading(year, () => Promise.all([
      this.fetchDrivers(year),
      this.tab === 'constructors' ? this.fetchConstructors(year) : Promise.resolve()
    ]));
  }

  async setTab(tab: StandingsTab): Promise<void> {
    this.tab = tab;
    this.stateService.tab = tab;
    this.hiddenSeriesIds.clear();
    this.hoveredSeriesId = null;
    const year = this.selectedSeason;
    if (tab !== 'constructors' || year === null || this.constructorsLoadedFor === year) return;
    await this.withLoading(year, () => this.fetchConstructors(year));
  }

  async openSeasonFromHallOfFame(year: number): Promise<void> {
    this.tab = 'drivers';
    this.stateService.tab = 'drivers';
    await this.selectSeason(year);
  }

  get error(): boolean {
    if (this.tab === 'hall-of-fame') return false;
    return this.initError || (this.tab === 'drivers' ? this.driversError : this.constructorsError);
  }

  // Mostra lo skeleton finché il lavoro non è finito, se nel frattempo la stagione non è cambiata
  private async withLoading(year: number, work: () => Promise<unknown>): Promise<void> {
    this.loading = true;
    this.slowLoading = false;
    clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => this.slowLoading = this.loading, SLOW_LOADING_MS);
    try {
      await work();
    } finally {
      if (this.selectedSeason === year) {
        this.loading = false;
        this.slowLoading = false;
        clearTimeout(this.slowTimer);
      }
    }
  }

  private setDrivers(standings: DriverStanding[]): void {
    this.driverStandings = standings;
    this.driverRows = standings.slice(3);
    if (this.wikipedia) {
      const titles = standings.map(s => s.wikiTitle).filter((t): t is string => !!t).slice(0, 50);
      if (titles.length) {
        this.wikipedia.getImages(titles).then(images => {
          for (const s of standings) {
            if (s.wikiTitle && images.has(s.wikiTitle)) {
              this.driverPhotos.set(s.driverId, images.get(s.wikiTitle)!);
            }
          }
        }).catch(() => {});
      }
    }
  }

  private setConstructors(standings: ConstructorStanding[]): void {
    this.constructorStandings = standings;
    this.constructorRows = standings.slice(3);
  }

  // Ogni risposta controlla che la stagione sia ancora quella scelta: altrimenti non serve più
  private async fetchDrivers(year: number): Promise<void> {
    try {
      const standings = await this.jolpica.getDriverStandings(year);
      if (this.selectedSeason === year) this.setDrivers(standings);
    } catch (err) {
      // 404: Jolpica non ha questa stagione, non è un'interruzione del servizio
      if (this.selectedSeason === year && !isNotFound(err)) this.driversError = true;
    }
  }

  private async fetchConstructors(year: number): Promise<void> {
    this.constructorsError = false;
    try {
      // Prima del 1958 il campionato costruttori non esisteva: nessuna richiesta
      const standings = year < FIRST_CONSTRUCTORS_SEASON ? [] : await this.jolpica.getConstructorStandings(year);
      if (this.selectedSeason !== year) return;
      this.setConstructors(standings);
      this.constructorsLoadedFor = year;
    } catch (err) {
      if (this.selectedSeason === year && !isNotFound(err)) this.constructorsError = true;
    }
  }

  private async fetchSeasonRounds(year: number): Promise<void> {
    if (this.roundsLoadedFor === year) return;
    this.chartLoading = true;
    try {
      const rounds = await this.jolpica.getSeasonPointsByRound(year);
      if (this.selectedSeason !== year) return;
      this.seasonRounds = rounds;
      this.roundsLoadedFor = year;
      this.selectedRoundIndex = rounds.length > 0 ? rounds.length - 1 : null;
    } catch {
      if (this.selectedSeason === year) {
        this.seasonRounds = [];
      }
    } finally {
      if (this.selectedSeason === year) {
        this.chartLoading = false;
      }
    }
  }

  setChartTopLimit(limit: 5 | 8 | 10): void {
    this.chartTopLimit = limit;
    this.hiddenSeriesIds.clear();
  }

  toggleSeries(id: string): void {
    if (this.hiddenSeriesIds.has(id)) {
      this.hiddenSeriesIds.delete(id);
    } else {
      const allCandidates = this.progressionCandidates;
      const visibleCount = allCandidates.filter(c => !this.hiddenSeriesIds.has(c.id)).length;
      if (visibleCount > 1) {
        this.hiddenSeriesIds.add(id);
      }
    }
  }

  isSeriesHidden(id: string): boolean {
    return this.hiddenSeriesIds.has(id);
  }

  get progressionCandidates(): (ProgressionContenderInput & { dashed: boolean; points: number })[] {
    const teamCounts = new Map<string, number>();
    if (this.tab === 'constructors') {
      return this.constructorStandings.slice(0, this.chartTopLimit).map(c => {
        const count = (teamCounts.get(c.constructorId) ?? 0) + 1;
        teamCounts.set(c.constructorId, count);
        return {
          id: c.constructorId,
          label: c.name,
          shortLabel: c.name,
          color: '#' + this.colorFor(c.constructorId),
          teamKey: c.constructorId,
          dashed: count > 1,
          points: c.points
        };
      });
    }

    return this.driverStandings.slice(0, this.chartTopLimit).map(s => {
      const key = s.constructorId || s.driverId;
      const count = (teamCounts.get(key) ?? 0) + 1;
      teamCounts.set(key, count);
      const lastName = s.fullName.trim().split(/\s+/).slice(-1)[0] || s.fullName;
      return {
        id: s.driverId,
        label: s.fullName,
        shortLabel: s.code || lastName,
        color: '#' + this.driverColor(s),
        teamKey: key,
        dashed: count > 1,
        points: s.points
      };
    });
  }

  get progressionChart(): PointsProgressionChart | null {
    if (this.tab === 'hall-of-fame' || !this.seasonRounds.length) return null;
    const active = this.progressionCandidates.filter(c => !this.hiddenSeriesIds.has(c.id));
    return buildPointsProgressionChart(
      this.seasonRounds,
      active,
      this.tab === 'constructors' ? 'constructors' : 'drivers'
    );
  }

  get activeRoundIndex(): number {
    if (!this.seasonRounds.length) return 0;
    if (this.selectedRoundIndex !== null && this.selectedRoundIndex >= 0 && this.selectedRoundIndex < this.seasonRounds.length) {
      return this.selectedRoundIndex;
    }
    return this.seasonRounds.length - 1;
  }

  get activeRoundInfo(): SeasonRoundPoints | null {
    return this.seasonRounds[this.activeRoundIndex] ?? null;
  }

  selectRoundIndex(idx: number): void {
    this.selectedRoundIndex = idx;
  }

  private async loadCurrentGrid(): Promise<void> {
    try {
      for (const d of await this.openF1.getLatestDrivers()) {
        if (d.name_acronym) this.currentGrid.set(d.name_acronym.toUpperCase(), d);
      }
    } catch {
      // senza griglia OpenF1 restano iniziali e colori per costruttore
    }
  }

  get isCurrentSeason(): boolean {
    return this.selectedSeason !== null && this.selectedSeason === this.latestSeason;
  }

  get constructorsNotYetAwarded(): boolean {
    return this.selectedSeason !== null && this.selectedSeason < FIRST_CONSTRUCTORS_SEASON;
  }

  // Ordine del podio a schermo: secondo, primo, terzo
  get driverPodium(): DriverStanding[] {
    return this.podiumOrder(this.driverStandings);
  }

  get constructorPodium(): ConstructorStanding[] {
    return this.podiumOrder(this.constructorStandings);
  }

  private podiumOrder<T>(rows: T[]): T[] {
    const [first, second, third] = rows;
    return [second, first, third].filter((row): row is T => row !== undefined);
  }

  /** Link al dettaglio pilota: esiste solo dal 2023 (dati OpenF1) e per chi ha una sigla */
  // Dal 2023 la pagina con i dati OpenF1, prima quella storica
  driverLink(standing: DriverStanding): string[] {
    if (this.selectedSeason !== null && this.selectedSeason >= FIRST_OPENF1_SEASON && standing.code) return ['/drivers', standing.code];
    return ['/drivers', 'storico', standing.driverId];
  }

  // Pilota della griglia OpenF1 attuale, solo se è la stagione in corso e la squadra coincide
  private gridDriverFor(standing: DriverStanding): Driver | undefined {
    if (!this.isCurrentSeason || !standing.code) return undefined;
    const driver = this.currentGrid.get(standing.code.toUpperCase());
    return driver && (OPENF1_TEAMS[standing.constructorId] ?? []).includes(driver.team_name) ? driver : undefined;
  }

  photoFor(standing: DriverStanding): string | undefined {
    if (this.failedPhotos.has(standing.driverId) || (standing.code && this.failedPhotos.has(standing.code))) return undefined;
    const driver = this.gridDriverFor(standing);
    if (driver) return currentSeasonPhotoUrl(driver);
    return this.driverPhotos.get(standing.driverId);
  }

  onPhotoError(standing: DriverStanding): void {
    this.failedPhotos.add(standing.driverId);
    if (standing.code) this.failedPhotos.add(standing.code);
  }

  /** Colore del pilota: quello ufficiale di OpenF1 nella stagione in corso, altrimenti per costruttore */
  driverColor(standing: DriverStanding): string {
    return (this.gridDriverFor(standing)?.team_color || this.colorFor(standing.constructorId)).replace('#', '');
  }

  colorFor(constructorId: string): string {
    return constructorColor(constructorId);
  }

  logoFor(constructorId: string): ConstructorLogo | undefined {
    return this.failedLogos.has(constructorId) ? undefined : constructorLogo(constructorId);
  }

  onLogoError(constructorId: string): void {
    this.failedLogos.add(constructorId);
  }

  /** Iniziali di nome e cognome: "Ayrton Senna" → "AS" */
  initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const first = words[0].charAt(0);
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  // Sfondo leggero della riga con il colore del team, come nelle tabelle dei risultati
  rowStyle(color: string): Record<string, string> {
    const hex = color.padEnd(6, '0');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.substring(i, i + 2), 16) || 0);
    return { 'background-color': `rgba(${r}, ${g}, ${b}, 0.08)` };
  }
}
