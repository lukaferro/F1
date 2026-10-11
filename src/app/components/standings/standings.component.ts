import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ConstructorStanding, DriverStanding, JolpicaService } from '../../services/jolpica.service';
import { Driver, Openf1ServiceService } from '../../services/openf1-service';
import { currentSeasonPhotoUrl } from '../../utils/f1-media';
import { CONSTRUCTOR_COLORS } from '../../utils/team-colors';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

type StandingsTab = 'drivers' | 'constructors';

// Prima stagione con dati OpenF1: da qui in poi esiste la pagina di dettaglio del pilota
const FIRST_OPENF1_SEASON = 2023;
// Anno di nascita del campionato costruttori
const FIRST_CONSTRUCTORS_SEASON = 1958;
const NEUTRAL_COLOR = '666666';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [FormsModule, RouterLink, SelectModule, ApiUnavailableComponent],
  templateUrl: './standings.component.html',
  styleUrl: './standings.component.css'
})
export class StandingsComponent implements OnInit {
  private readonly jolpica = inject(JolpicaService);
  private readonly openF1 = inject(Openf1ServiceService);

  seasons: number[] = [];
  seasonOptions: { label: string; value: number }[] = [];
  selectedSeason: number | null = null;
  latestSeason: number | null = null;
  tab: StandingsTab = 'drivers';

  driverStandings: DriverStanding[] = [];
  constructorStandings: ConstructorStanding[] = [];
  private constructorsLoadedFor: number | null = null;

  loading = true;
  error = false;

  // Griglia attuale di OpenF1 (per sigla): foto e colori ufficiali della stagione in corso
  private readonly currentGrid = new Map<string, Driver>();
  // Foto che non si sono caricate: al loro posto le iniziali
  private readonly failedPhotos = new Set<string>();

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = false;
    try {
      const [seasons, latest] = await Promise.all([this.jolpica.getSeasons(), this.jolpica.getLatestSeasonWithStandings()]);
      this.seasons = seasons;
      this.seasonOptions = seasons.map(year => ({ label: String(year), value: year }));
      this.latestSeason = latest;
      this.loadCurrentGrid();
      await this.selectSeason(latest);
    } catch {
      this.error = true;
      this.loading = false;
    }
  }

  async selectSeason(year: number): Promise<void> {
    this.selectedSeason = year;
    this.loading = true;
    this.error = false;
    this.driverStandings = [];
    this.constructorStandings = [];
    this.constructorsLoadedFor = null;

    try {
      const standings = await this.jolpica.getDriverStandings(year);
      // Nel frattempo è stata scelta un'altra stagione: questa risposta non serve più
      if (this.selectedSeason !== year) return;
      this.driverStandings = standings;
      if (this.tab === 'constructors') await this.loadConstructors(year);
    } catch {
      if (this.selectedSeason === year) this.error = true;
    } finally {
      if (this.selectedSeason === year) this.loading = false;
    }
  }

  async setTab(tab: StandingsTab): Promise<void> {
    this.tab = tab;
    const year = this.selectedSeason;
    if (tab !== 'constructors' || year === null || this.constructorsLoadedFor === year) return;

    this.loading = true;
    try {
      await this.loadConstructors(year);
    } catch {
      if (this.selectedSeason === year) this.error = true;
    } finally {
      if (this.selectedSeason === year) this.loading = false;
    }
  }

  private async loadConstructors(year: number): Promise<void> {
    // Prima del 1958 il campionato costruttori non esisteva: nessuna richiesta
    const standings = year < FIRST_CONSTRUCTORS_SEASON ? [] : await this.jolpica.getConstructorStandings(year);
    if (this.selectedSeason !== year) return;
    this.constructorStandings = standings;
    this.constructorsLoadedFor = year;
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
  driverLink(standing: DriverStanding): string[] | null {
    if (this.selectedSeason === null || this.selectedSeason < FIRST_OPENF1_SEASON || !standing.code) return null;
    return ['/drivers', standing.code];
  }

  photoFor(standing: DriverStanding): string | undefined {
    if (!this.isCurrentSeason || !standing.code || this.failedPhotos.has(standing.code)) return undefined;
    const driver = this.currentGrid.get(standing.code.toUpperCase());
    return driver ? currentSeasonPhotoUrl(driver) : undefined;
  }

  onPhotoError(standing: DriverStanding): void {
    if (standing.code) this.failedPhotos.add(standing.code);
  }

  /** Colore del pilota: quello ufficiale di OpenF1 nella stagione in corso, altrimenti per costruttore */
  driverColor(standing: DriverStanding): string {
    const driver = this.isCurrentSeason && standing.code ? this.currentGrid.get(standing.code.toUpperCase()) : undefined;
    return (driver?.team_color || this.colorFor(standing.constructorId)).replace('#', '');
  }

  colorFor(constructorId: string): string {
    return CONSTRUCTOR_COLORS[constructorId] ?? NEUTRAL_COLOR;
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
