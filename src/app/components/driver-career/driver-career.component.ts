import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';

import { CareerTotals, JolpicaService } from '../../services/jolpica.service';
import { ConstructorLogo, constructorColor, constructorLogo } from '../../utils/constructor-branding';
import { buildPositionChart, PositionChart } from '../../utils/position-chart';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

export interface CareerSeason {
  season: number;
  state: 'loading' | 'ready' | 'error';
  position?: number;   // assenti se il pilota non compare nella classifica della stagione
  points?: number;
  wins?: number;
  constructors: { id: string; name: string }[];
  inProgress: boolean; // stagione corrente non ancora conclusa
  champion: boolean;   // primo posto in una stagione conclusa
}

// Statistiche di carriera del dettaglio pilota, dall'archivio Jolpica
@Component({
  selector: 'app-driver-career',
  standalone: true,
  imports: [ApiUnavailableComponent],
  templateUrl: './driver-career.component.html',
  styleUrls: ['./driver-career.component.css']
})
export class DriverCareerComponent implements OnChanges, OnDestroy {
  private readonly jolpica = inject(JolpicaService);

  @Input({ required: true }) acronym!: string;
  @Input({ required: true }) fullName!: string;
  /** Nazionalità Jolpica (es. "British"), utile se OpenF1 non ha il paese */
  @Output() nationality = new EventEmitter<string>();

  totals: CareerTotals | null = null;
  seasons: CareerSeason[] = [];
  loading = true;
  error = false;
  notFound = false;

  private driverId: string | null = null;
  // ogni caricamento ha il suo numero: le risposte di un pilota precedente vengono ignorate
  private loadSeq = 0;
  private readonly failedLogos = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['acronym'] || changes['fullName']) this.load();
  }

  // la pagina è cambiata: le stagioni ancora da chiedere non servono più
  ngOnDestroy(): void {
    this.loadSeq++;
  }

  get seasonsComplete(): boolean {
    return this.seasons.every(s => s.state !== 'loading');
  }

  get seasonsFailed(): boolean {
    return this.seasons.some(s => s.state === 'error');
  }

  /** Somma dei punti delle stagioni; null finché non sono tutte caricate senza errori */
  get totalPoints(): number | null {
    if (!this.seasonsComplete || this.seasonsFailed) return null;
    return this.seasons.reduce((sum, s) => sum + (s.points ?? 0), 0);
  }

  /** Righe della tabella: senza le stagioni in cui il pilota non è in classifica (es. solo prove libere) */
  get tableSeasons(): CareerSeason[] {
    return this.seasons.filter(s => !(s.state === 'ready' && s.position === undefined));
  }

  get titleYears(): number[] {
    return this.seasons.filter(s => s.champion).map(s => s.season).sort((a, b) => a - b);
  }

  async retry(): Promise<void> {
    if (this.error || !this.driverId) return this.load();
    const seq = this.loadSeq;
    await Promise.all(this.seasons.filter(s => s.state === 'error').map(s => this.loadSeason(s, seq)));
  }

  private async load(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.error = false;
    this.notFound = false;
    this.totals = null;
    this.seasons = [];
    this.driverId = null;
    try {
      const match = await this.jolpica.findDriver(this.acronym ?? '', this.fullName ?? '');
      if (seq !== this.loadSeq) return;
      if (!match) {
        this.notFound = true;
        return;
      }
      this.nationality.emit(match.nationality);
      const [totals, seasons] = await Promise.all([
        this.jolpica.getCareerTotals(match.driverId),
        this.jolpica.getDriverSeasons(match.driverId)
      ]);
      if (seq !== this.loadSeq) return;
      if (totals.races === 0) {
        this.notFound = true;
        return;
      }
      this.driverId = match.driverId;
      this.totals = totals;
      this.seasons = seasons.map(season => ({ season, state: 'loading', constructors: [], inProgress: false, champion: false }));
      this.loadSeasons(seq);
    } catch {
      if (seq === this.loadSeq) this.error = true;
    } finally {
      if (seq === this.loadSeq) this.loading = false;
    }
  }

  // Una stagione alla volta, dalla più recente: se nel frattempo si cambia pilota (o pagina)
  // le richieste rimaste non partono e non occupano la coda di Jolpica
  private async loadSeasons(seq: number): Promise<void> {
    for (const row of [...this.seasons]) {
      if (seq !== this.loadSeq) return;
      await this.loadSeason(row, seq);
    }
  }

  private async loadSeason(row: CareerSeason, seq: number): Promise<void> {
    const index = this.seasons.indexOf(row);
    this.replace(index, { ...row, state: 'loading' });
    try {
      const standings = await this.jolpica.getDriverStandings(row.season);
      const inProgress = row.season === new Date().getFullYear() && !(await this.isSeasonOver(row.season));
      if (seq !== this.loadSeq) return;
      const mine = standings.find(s => s.driverId === this.driverId);
      this.replace(index, {
        ...row,
        state: 'ready',
        position: mine?.position,
        points: mine?.points,
        wins: mine?.wins,
        constructors: mine?.constructors ?? [],
        inProgress,
        champion: mine?.position === 1 && !inProgress
      });
    } catch {
      if (seq === this.loadSeq) this.replace(index, { ...row, state: 'error' });
    }
  }

  // La stagione corrente è conclusa quando la classifica è aggiornata all'ultima gara in calendario
  // Se il controllo fallisce la stagione resta "in corso": nessun titolo contato per errore, punti intatti
  private async isSeasonOver(season: number): Promise<boolean> {
    try {
      const [round, races] = await Promise.all([this.jolpica.getStandingsRound(season), this.jolpica.getSeasonRaceCount(season)]);
      return races > 0 && round === races;
    } catch {
      return false;
    }
  }

  private replace(index: number, row: CareerSeason): void {
    this.seasons = this.seasons.map((s, i) => i === index ? row : s);
  }

  /** Grafico delle posizioni finali: solo stagioni caricate in cui il pilota è in classifica */
  get chart(): PositionChart | null {
    return buildPositionChart(this.seasons
      .filter(s => s.state === 'ready' && s.position !== undefined)
      .map(s => ({ season: s.season, position: s.position!, color: this.teamColor(s), inProgress: s.inProgress })));
  }

  teamNames(row: CareerSeason): string {
    return row.constructors.map(c => c.name).join(' / ');
  }

  /** Colore dell'ultima squadra della stagione */
  teamColor(row: CareerSeason): string {
    const last = row.constructors[row.constructors.length - 1];
    return `#${constructorColor(last?.id ?? '')}`;
  }

  logoFor(constructorId: string): ConstructorLogo | undefined {
    return this.failedLogos.has(constructorId) ? undefined : constructorLogo(constructorId);
  }

  /** Almeno un logo nella riga: su schermi stretti basta quello */
  hasLogo(row: CareerSeason): boolean {
    return row.constructors.some(c => !!this.logoFor(c.id));
  }

  onLogoError(constructorId: string): void {
    this.failedLogos.add(constructorId);
  }
}
