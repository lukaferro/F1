import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Meeting } from '../../models/meeting';
import { 
  Openf1ServiceService, 
  Driver, 
  Result,
  Stint,
  TeamRadio,
  RaceControlMessage,
  Weather,
  Pit,
  Overtake,
  LapData
} from '../../services/openf1-service';
import { Session } from '../../models/session';
import { circuitMapUrl, SponsorInfo, titleSponsor } from '../../utils/f1-media';
import { TEAM_COLORS } from '../../utils/team-colors';
import {
  buildLapComparisonChart,
  buildTelemetryComparisonChart,
  LapComparisonChart,
  LapComparisonRow,
  resolveLapTimeWindow,
  TelemetryAlignedSample,
  TelemetryComparisonChart,
  TelemetryDriverInput,
  TelemetryLapWindow
} from '../../utils/telemetry-chart';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

type SessionTab = 'results' | 'telemetry' | 'stints' | 'race_control' | 'weather' | 'pits' | 'overtakes' | 'radio';

// Un segmento della barra della strategia gomme
export interface TyreSegment {
  compound: string;   // classe CSS: soft, medium, hard, intermediate, wet
  compoundLabel: string;
  short: string;      // iniziale mostrata nel segmento
  laps: number;       // numero di giri percorsi nello stint
  lapStart: number;
  lapEnd: number;
  widthPct: number;   // larghezza in proporzione ai giri della sessione
  tooltip: string;
}

export interface GroupedStint {
  driver_number: number;
  positionLabel: string;
  stopsCount: number;
  pitLapsLabel: string;
  totalLaps: number;
  segments: TyreSegment[];
}

export interface StintSessionSummary {
  mostUsedCompound: string;
  mostUsedPct: number;
  avgStops: string;
  longestStintDriver: string;
  longestStintCompound: string;
  longestStintLaps: number;
}

export interface SessionTelemetryState {
  driverANumber: number;
  driverBNumber: number;
  filterOutliers: boolean;
  lapsLoading: boolean;
  telemetryLoading: boolean;
  lapsByDriver: { [driver_number: number]: LapData[] };
  lapChart: LapComparisonChart | null;
  activeLapIndex: number;
  telemetryChart: TelemetryComparisonChart | null;
  activeTelemetryIndex: number;
  telemetryLapA: TelemetryLapWindow | null;
  telemetryLapB: TelemetryLapWindow | null;
  customLapNumber: number | null;
}

export type RaceControlFilter = 'all' | 'red_flag' | 'safety_car' | 'vsc' | 'penalty' | 'drs';

export interface RaceControlState {
  searchQuery: string;
  selectedFilter: RaceControlFilter;
  selectedDriver: number | null; // null = tutti i piloti
}

export interface RadioState {
  searchQuery: string;
  selectedDriver: number | null; // null = tutti i piloti
  sortAscending: boolean; // true = dal primo all'ultimo, false = dal più recente
  playingUrl: string | null;
  playingCurrentTime: number;
  playingDuration: number;
  isPlaying: boolean;
}

const COMPOUND_LABELS: Record<string, string> = {
  soft: 'Soft', medium: 'Medium', hard: 'Hard', intermediate: 'Intermedie', wet: 'Da bagnato'
};

@Component({
  selector: 'app-gran-premi-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, TableModule, ApiUnavailableComponent],
  templateUrl: './gran-premi-detail.component.html',
  styleUrl: './gran-premi-detail.component.css'
})
export class GranPremiDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly openF1Service = inject(Openf1ServiceService);

  meeting: Meeting | null = null;
  seasonMeetings: Meeting[] = [];
  loading = true;
  error?: string;

  drivers: Driver[] = [];
  sessions: Session[] = [];
  sessionResultsNormalized: { [session_key: number]: Result[] } = {};
  expandedSessionKey: number | null = null;

  // Additional session data
  stints: { [session_key: number]: Stint[] } = {};
  teamRadios: { [session_key: number]: TeamRadio[] } = {};
  raceControlMessages: { [session_key: number]: RaceControlMessage[] } = {};
  weather: { [session_key: number]: Weather[] } = {};
  pits: { [session_key: number]: Pit[] } = {};
  overtakes: { [session_key: number]: Overtake[] } = {};
  // Dati già elaborati per il template (calcolati una volta al caricamento, non a ogni aggiornamento)
  groupedStints: { [session_key: number]: GroupedStint[] } = {};
  stintSummaries: { [session_key: number]: StintSessionSummary | null } = {};
  fastestPitBySession: { [session_key: number]: Pit | null } = {};
  filteredWeather: { [session_key: number]: Weather[] } = {};
  telemetryState: { [session_key: number]: SessionTelemetryState } = {};

  // Filtri e stato interattivo Direzione Gara e Team Radio per sessione
  raceControlState: { [session_key: number]: RaceControlState } = {};
  radioState: { [session_key: number]: RadioState } = {};

  // Tab di ogni sessione: i dati vengono scaricati solo quando il tab viene aperto,
  // perché OpenF1 accetta al massimo 30 richieste al minuto
  readonly sessionTabs: { id: SessionTab; label: string }[] = [
    { id: 'results', label: 'Risultati' },
    { id: 'telemetry', label: 'Telemetria & Giri' },
    { id: 'stints', label: 'Gomme' },
    { id: 'race_control', label: 'Direzione Gara' },
    { id: 'radio', label: 'Team Radio' },
    { id: 'weather', label: 'Meteo' },
    { id: 'pits', label: 'Pit Stop' },
    { id: 'overtakes', label: 'Sorpassi' }
  ];
  activeTab: { [session_key: number]: SessionTab } = {};
  private readonly tabRequests = new Map<string, Promise<void>>();
  private readonly loadingTabs = new Set<string>();

  loadingSessions = false;

  currentSponsor?: SponsorInfo;

  // Audio HTML5 globale per player avanzato
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentAudioSessionKey: number | null = null;

  // Mappatura dei codici paese dell'API ai codici ISO 3166-1 alpha-2 per le bandiere
  countryCodeMapping: Record<string, string> = {
    'BRN': 'bh', // Bahrain
    'KSA': 'sa', // Saudi Arabia
    'AUS': 'au', // Australia
    'JPN': 'jp', // Japan
    'CHN': 'cn', // China
    'USA': 'us', // United States
    'ITA': 'it', // Italy
    'MON': 'mc', // Monaco
    'CAN': 'ca', // Canada
    'ESP': 'es', // Spain
    'AUT': 'at', // Austria
    'GBR': 'gb', // Great Britain
    'HUN': 'hu', // Hungary
    'BEL': 'be', // Belgium
    'NED': 'nl', // Netherlands
    'AZE': 'az', // Azerbaijan
    'SGP': 'sg', // Singapore
    'MEX': 'mx', // Mexico
    'BRA': 'br', // Brazil
    'UAE': 'ae', // United Arab Emirates (Abu Dhabi)
    'QAT': 'qa', // Qatar
    'FRA': 'fr', // France
    'DEU': 'de', // Germany
    'GER': 'de', // Germany (codice alternativo)
    'RUS': 'ru', // Russia
    'PRT': 'pt', // Portugal
    'TUR': 'tr', // Turkey
    'MYS': 'my', // Malaysia
    'JOR': 'jo', // Jordan
    'KOR': 'kr', // South Korea
    'IND': 'in', // India
    'ZAF': 'za', // South Africa
    'ABU': 'ae', // Abu Dhabi (codice alternativo)
    'ARG': 'ar', // Argentina
    'BAH': 'bh', // Bahrain (codice alternativo)
    'SIN': 'sg', // Singapore (codice alternativo)
    'JAP': 'jp', // Japan (codice alternativo)
    'MAL': 'my', // Malaysia (codice alternativo)
    'EUR': 'eu', // Europa
    'STY': 'at', // Styria (Austria)
    'EMI': 'it', // Emilia Romagna (Italia)
    'TUS': 'it', // Toscana (Italia)
    'POR': 'pt', // Portogallo (codice alternativo)
    'LUX': 'lu', // Lussemburgo
    'MIA': 'us', // Miami (USA)
    'LAS': 'us', // Las Vegas (USA)
    'TEX': 'us', // Texas (USA)
    'CAT': 'es', // Catalogna (Spagna)
    'SPA': 'be', // Spa (Belgio)
    'EIF': 'de', // Eifel (Germania)
    'MUG': 'it', // Mugello (Italia)
    'AZB': 'az'  // Azerbaijan (codice alternativo)
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadMeeting(Number(id));
      }
    });
  }

  get currentMeetingIndex(): number {
    if (!this.meeting) return -1;
    return this.seasonMeetings.findIndex(m => m.meeting_key === this.meeting!.meeting_key);
  }

  get prevMeeting(): Meeting | null {
    const idx = this.currentMeetingIndex;
    return idx > 0 ? this.seasonMeetings[idx - 1] : null;
  }

  get nextMeeting(): Meeting | null {
    const idx = this.currentMeetingIndex;
    return idx >= 0 && idx < this.seasonMeetings.length - 1 ? this.seasonMeetings[idx + 1] : null;
  }

  get prevRoundNumber(): number | null {
    const idx = this.currentMeetingIndex;
    return idx > 0 ? idx : null;
  }

  get nextRoundNumber(): number | null {
    const idx = this.currentMeetingIndex;
    return idx >= 0 && idx < this.seasonMeetings.length - 1 ? idx + 2 : null;
  }

  getCircuitImage(meeting: Meeting): string | undefined {
    return circuitMapUrl(meeting.circuit_short_name) ?? meeting.circuit_image;
  }

  // Se la mappa dettagliata non esiste per questo circuito usa quella semplice di OpenF1
  onCircuitImageError(event: Event, meeting: Meeting): void {
    const img = event.target as HTMLImageElement;
    if (meeting.circuit_image && img.src !== meeting.circuit_image) {
      img.src = meeting.circuit_image;
    }
  }

  // Converte i codici paese dell'API in codici ISO 3166-1 alpha-2 per le bandiere
  getCountryFlagCode(apiCountryCode: string): string {
    return this.countryCodeMapping[apiCountryCode] || apiCountryCode.toLowerCase();
  }

  // Formatta il fuso orario in formato italiano (24 ore)
  formatTimeOffset(offset: string): string {
    if (!offset) return 'UTC+0';

    // Rimuove i secondi e mantiene solo ore e minuti
    const timeRegex = /^([+-]?)(\d{2}):(\d{2}):(\d{2})$/;
    const match = offset.match(timeRegex);

    if (match) {
      const sign = match[1] || '+';
      const hours = match[2];
      const minutes = match[3];

      if (minutes === '00') {
        return `UTC${sign}${hours}`;
      } else {
        return `UTC${sign}${hours}:${minutes}`;
      }
    }

    return `UTC ${offset}`;
  }

  // Formatta il tempo in formato leggibile
  formatTime(timeMillis?: number): string {
    if (!timeMillis) return '-';

    const totalSeconds = Math.floor(timeMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = timeMillis % 1000;

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  private parseNumeric(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (/^\d+:\d{2}(\.\d+)?$/.test(trimmed)) {
        const [minutes, rest] = trimmed.split(':');
        const baseSeconds = Number(rest);
        if (Number.isNaN(baseSeconds)) {
          return null;
        }
        return Number(minutes) * 60 + baseSeconds;
      }
      const normalized = Number(trimmed.replace(',', '.'));
      return Number.isFinite(normalized) ? normalized : null;
    }
    return null;
  }

  private formatSecondsValue(seconds: number): string {
    if (!Number.isFinite(seconds)) {
      return '-';
    }
    if (seconds < 60) {
      return `${seconds.toFixed(3)} s`;
    }
    const remainder = (seconds % 60).toFixed(3).padStart(6, '0');
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes}:${remainder}`;
    }
    // Tempi di gara oltre l'ora: h:mm:ss.mmm (es. 1:42:06.304 invece di 102:06.304)
    const hours = Math.floor(totalMinutes / 60);
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}:${remainder}`;
  }

  formatSeconds(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (Array.isArray(value)) {
      const first = value.find(v => v !== null && v !== undefined);
      return first !== undefined ? this.formatSeconds(first) : '-';
    }
    if (typeof value === 'number') {
      return this.formatSecondsValue(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '-';
      }
      if (/^\d+:\d{2}(\.\d+)?$/.test(trimmed)) {
        return trimmed;
      }
      const numeric = this.parseNumeric(trimmed);
      if (numeric !== null) {
        return this.formatSecondsValue(numeric);
      }
      return trimmed;
    }
    return '-';
  }

  // Qualifying helpers: duration and gaps can be arrays; return formatted value or fallback
  getQualDuration(result: any, idx: number): string {
    if (!result) return '-';
    const duration = Array.isArray(result.duration) ? result.duration[idx] : result.duration;
    return this.formatSeconds(duration);
  }

  getQualGap(result: any, idx: number): string {
    if (!result) return '-';
    const gap = Array.isArray(result.gap_to_leader) ? result.gap_to_leader[idx] : result.gap_to_leader;
    if (gap === null || gap === undefined) {
      return '-';
    }
    const numeric = this.parseNumeric(gap);
    if (numeric !== null) {
      return numeric === 0 ? '-' : `+${numeric.toFixed(3)} s`;
    }
    if (typeof gap === 'string') {
      const trimmed = gap.trim();
      return trimmed ? trimmed : '-';
    }
    return '-';
  }

  // Compute a very light rgba background from hex team color (accepts '#RRGGBB' or 'RRGGBB' or short)
  getTeamRowStyle(color?: string): { [klass: string]: string } {
    const hex = (color || '').replace('#', '').trim();
    // default light transparent white/gray if color missing
    if (!hex || hex.length < 3) {
      return { 'background-color': 'rgba(255,255,255,0.02)' };
    }

    // expand short form
    const fullHex = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex.substring(0, 6);

    const r = parseInt(fullHex.substring(0, 2), 16) || 0;
    const g = parseInt(fullHex.substring(2, 4), 16) || 0;
    const b = parseInt(fullHex.substring(4, 6), 16) || 0;

    // low alpha for subtle background
    return { 'background-color': `rgba(${r}, ${g}, ${b}, 0.06)` };
  }

  // Small utility wrappers for template (Array.isArray isn't allowed in strict templates)
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  formatGapForDisplay(result: any): string {
    if (!result) return '-';
    const gap = Array.isArray(result.gap_to_leader) ? result.gap_to_leader[0] : result.gap_to_leader;
    if (gap === null || gap === undefined) {
      return '-';
    }
    const numeric = this.parseNumeric(gap);
    if (numeric !== null) {
      return numeric === 0 ? '-' : `+${numeric.toFixed(3)} s`;
    }
    if (typeof gap === 'string') {
      const trimmed = gap.trim();
      return trimmed ? trimmed : '-';
    }
    return '-';
  }

  formatPrimaryDuration(result: any): string {
    if (!result) return '-';
    const source = Array.isArray(result.duration) ? result.duration[0] : result.duration;
    const formatted = this.formatSeconds(source);
    if (formatted !== '-') {
      return formatted;
    }
    if (typeof result.lap_time === 'string') {
      const lapTime = result.lap_time.trim();
      if (lapTime) {
        return lapTime;
      }
    }
    if (typeof result.status === 'string') {
      const status = result.status.trim();
      if (status) {
        return status;
      }
    }
    return '-';
  }

  // Ottiene il nome della sessione in italiano
  getSessionName(session: Session): string {
    const typeMap: Record<string, string> = {
      'Race': 'Race',
      'Qualifying': 'Qualifying',
      'Sprint': 'Sprint Race',
      'Practice 1': 'FP1',
      'Practice 2': 'FP2',
      'Practice 3': 'FP3',
      'Sprint Qualifying': 'Sprint Qualifying'
    };

    return typeMap[session.session_type] || session.session_name;
  }

  // Formatta la data della sessione
  formatSessionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Ottiene il colore del team
  getTeamColor(color: string): string {
    return `#${color}`;
  }

  // Nuovi metodi per ottenere informazioni dei piloti
  getDriverTeamColor(driverNumber: number): string {
    const driver = this.drivers.find(d => d.driver_number === driverNumber);
    return driver?.team_color || 'FFFFFF';
  }

  getDriverName(driverNumber: number): string {
    const driver = this.drivers.find(d => d.driver_number === driverNumber);
    if (!driver) return `Driver ${driverNumber}`;

    // Prefer full_name or name fields when available
    const raw = (driver as any).full_name || (driver as any).name || driver.broadcast_name;
    if (raw && typeof raw === 'string') {
      const parts = raw.trim().split(/\s+/);
      if (parts.length === 1) return parts[0];
      const last = parts.pop();
      const first = parts.shift();
      const initial = first ? first.charAt(0).toUpperCase() + '.' : '';
      return `${initial} ${last}`.trim();
    }

    return driver.broadcast_name || `Driver ${driverNumber}`;
  }

  getDriverAcronym(driverNumber: number): string {
    const driver = this.drivers.find(d => d.driver_number === driverNumber);
    if (driver?.name_acronym) return driver.name_acronym;
    const name = this.getDriverName(driverNumber);
    const last = name.split(' ').pop() || name;
    return last.substring(0, 3).toUpperCase();
  }

  getDriverTeam(driverNumber: number): string {
    const driver = this.drivers.find(d => d.driver_number === driverNumber);
    return driver?.team_name || 'Unknown Team';
  }

  private toTelemetryDriverInput(driverNumber: number): TelemetryDriverInput {
    return {
      driverNumber,
      name: this.getDriverName(driverNumber),
      shortName: this.getDriverAcronym(driverNumber),
      teamName: this.getDriverTeam(driverNumber),
      color: this.getDriverTeamColor(driverNumber)
    };
  }

  // Restituisce i piloti ordinati per posizione nella sessione (o per numero di gara se senza classifica)
  getSessionOrderedDrivers(sessionKey: number): Driver[] {
    const results = this.sessionResultsNormalized[sessionKey] ?? [];
    if (!results.length) {
      return [...this.drivers].sort((a, b) => a.driver_number - b.driver_number);
    }
    const orderMap = new Map<number, number>();
    results.forEach((r, idx) => orderMap.set(r.driver_number, idx));
    return [...this.drivers].sort((a, b) => {
      const iA = orderMap.get(a.driver_number) ?? 999;
      const iB = orderMap.get(b.driver_number) ?? 999;
      return iA !== iB ? iA - iB : a.driver_number - b.driver_number;
    });
  }

  // Filtra i dati meteo per mostrare solo quelli ogni 30 minuti
  private filterWeather(weatherData: Weather[]): Weather[] {
    if (!weatherData.length) return [];

    // Ordina per data
    const sorted = [...weatherData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Prendi il primo elemento
    const filtered: Weather[] = [sorted[0]];
    let lastTime = new Date(sorted[0].date).getTime();

    // Aggiungi elementi ogni 30 minuti (1800000 ms)
    for (let i = 1; i < sorted.length; i++) {
      const currentTime = new Date(sorted[i].date).getTime();
      if (currentTime - lastTime >= 1800000) { // 30 minuti
        filtered.push(sorted[i]);
        lastTime = currentTime;
      }
    }

    return filtered;
  }

  // Raggruppa gli stint per pilota con la loro posizione finale, giri percorsi e soste
  groupStints(stintsData: Stint[], results: Result[]): GroupedStint[] {
    const totalLaps = Math.max(1, ...stintsData.map(st => st.lap_end ?? st.lap_start ?? 0));

    const byDriver = new Map<number, Stint[]>();
    for (const stint of stintsData) {
      if (!byDriver.has(stint.driver_number)) byDriver.set(stint.driver_number, []);
      byDriver.get(stint.driver_number)!.push(stint);
    }

    // Stesso ordine della classifica (arrivati, poi squalificati e ritirati); chi non è in classifica va in fondo
    const order = (driverNumber: number) => {
      const i = results.findIndex(r => r.driver_number === driverNumber);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };

    return [...byDriver.entries()]
      .sort(([a], [b]) => order(a) - order(b))
      .map(([driverNumber, stints]) => {
        const result = results.find(r => r.driver_number === driverNumber);
        const positionLabel = !result ? '-'
          : result.dsq ? 'DSQ' : result.dnf ? 'DNF' : result.dns ? 'DNS' : String(result.position ?? '-');

        const sortedStints = [...stints].sort((a, b) => a.stint_number - b.stint_number);
        const segments: TyreSegment[] = sortedStints.map(st => {
          const lapStart = st.lap_start ?? 1;
          const lapEnd = st.lap_end ?? lapStart;
          const laps = Math.max(1, lapEnd - lapStart + 1);
          const compound = (st.compound || 'unknown').toLowerCase();
          const name = COMPOUND_LABELS[compound] ?? st.compound ?? '?';
          return {
            compound,
            compoundLabel: name,
            short: name.charAt(0).toUpperCase(),
            laps,
            lapStart,
            lapEnd,
            widthPct: (laps / totalLaps) * 100,
            tooltip: `Stint ${st.stint_number} · ${name} · giri ${lapStart}–${lapEnd} (${laps} giri) · gomma con ${st.tyre_age_at_start ?? 0} giri all'inizio`
          };
        });

        const stopsCount = Math.max(0, segments.length - 1);
        const changeLaps = segments.slice(0, -1).map(s => `G${s.lapEnd}`);
        const pitLapsLabel = stopsCount > 0 ? changeLaps.join(', ') : '0 soste';
        const driverTotalLaps = segments.reduce((sum, s) => sum + s.laps, 0);

        return {
          driver_number: driverNumber,
          positionLabel,
          stopsCount,
          pitLapsLabel,
          totalLaps: driverTotalLaps,
          segments
        };
      });
  }

  computeStintSummary(grouped: GroupedStint[]): StintSessionSummary | null {
    if (!grouped.length) return null;

    const compoundLaps = new Map<string, number>();
    let totalAllLaps = 0;
    let totalStops = 0;
    let longestStintLaps = 0;
    let longestStintDriver = '-';
    let longestStintCompound = '-';

    for (const driverRow of grouped) {
      totalStops += driverRow.stopsCount;
      for (const seg of driverRow.segments) {
        totalAllLaps += seg.laps;
        compoundLaps.set(seg.compoundLabel, (compoundLaps.get(seg.compoundLabel) ?? 0) + seg.laps);
        if (seg.laps > longestStintLaps) {
          longestStintLaps = seg.laps;
          longestStintDriver = this.getDriverName(driverRow.driver_number);
          longestStintCompound = seg.compoundLabel;
        }
      }
    }

    let mostUsedCompound = '-';
    let mostUsedLaps = 0;
    for (const [comp, laps] of compoundLaps.entries()) {
      if (laps > mostUsedLaps) {
        mostUsedLaps = laps;
        mostUsedCompound = comp;
      }
    }

    const mostUsedPct = totalAllLaps > 0 ? Math.round((mostUsedLaps / totalAllLaps) * 100) : 0;
    const avgStops = (totalStops / grouped.length).toFixed(1);

    return {
      mostUsedCompound,
      mostUsedPct,
      avgStops,
      longestStintDriver,
      longestStintCompound,
      longestStintLaps
    };
  }

  computeFastestPit(pitsList: Pit[]): Pit | null {
    const valid = pitsList.filter(p => typeof p.pit_duration === 'number' && p.pit_duration > 0);
    if (!valid.length) return null;
    return valid.reduce((min, cur) => (cur.pit_duration < min.pit_duration ? cur : min), valid[0]);
  }

  isFastestPit(sessionKey: number, pit: Pit): boolean {
    const fastest = this.fastestPitBySession[sessionKey];
    if (!fastest) return false;
    return (
      fastest.driver_number === pit.driver_number &&
      fastest.lap_number === pit.lap_number &&
      fastest.pit_duration === pit.pit_duration
    );
  }

  async loadMeeting(id: number) {
    this.loading = true;
    this.error = undefined;
    this.expandedSessionKey = null;
    this.activeTab = {};
    this.telemetryState = {};
    this.raceControlState = {};
    this.radioState = {};
    this.tabRequests.clear();
    this.loadingTabs.clear();
    this.stopCurrentAudio();

    try {
      const meetings = await this.openF1Service.getMeetings();
      const list: Meeting[] = Array.isArray(meetings)
        ? meetings as Meeting[]
        : (meetings && Array.isArray((meetings as any).data) ? (meetings as any).data as Meeting[] : []);

      this.meeting = list.find((m: Meeting) => m.meeting_key === id) || null;

      if (!this.meeting) {
        this.seasonMeetings = [];
        this.error = 'Gran Premio non trovato';
        return;
      }

      const now = new Date();
      this.seasonMeetings = list
        .filter((m: Meeting) => m.year === this.meeting!.year && (new Date(m.date_start) <= now || m.meeting_key === id))
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

      this.currentSponsor = titleSponsor(this.meeting.meeting_official_name);

      // Carica piloti e poi sessioni per avere colori e nomi pronti prima della normalizzazione
      await this.loadDrivers(id);
      await this.loadSessions(id);
    } catch (err: any) {
      this.error = err?.message || 'Errore caricamento dettagli Gran Premio';
    } finally {
      this.loading = false;
    }
  }

  private async loadDrivers(meetingKey: number) {
    try {
      // Fetch all drivers for the meeting
      const drivers = await this.openF1Service.getDrivers(meetingKey, 'meeting');

      // Create a map of unique drivers by driver number to avoid duplicates
      const uniqueDrivers = new Map();
      drivers.forEach(driver => {
        if (!uniqueDrivers.has(driver.driver_number) || 
            (driver.team_color && !uniqueDrivers.get(driver.driver_number)?.team_color)) {
          uniqueDrivers.set(driver.driver_number, driver);
        }
      });

      // Convert map back to array
      this.drivers = Array.from(uniqueDrivers.values());


      // Apply default team colors if missing
      this.drivers = this.drivers.map(driver => ({
        ...driver,
        team_color: driver.team_color || TEAM_COLORS[driver.team_name] || 'FFFFFF'
      }));

      // Drivers caricati e normalizzati
    } catch (err) {
      // Errore nel caricamento dei piloti
    }
  }

  private async loadSessions(meetingKey: number) {
    this.loadingSessions = true;
    try {
      const sessionsRaw = await this.openF1Service.getSessions(meetingKey);
      // Map sessions from service (which have id) to Session model type (which has session_key)
      this.sessions = sessionsRaw.map(s => ({
        ...s,
        session_key: (s as any).session_key ?? (s as any).id ?? 0,
        location: (s as any).location ?? '',
        country_key: (s as any).country_key ?? 0,
        country_code: (s as any).country_code ?? '',
        country_name: (s as any).country_name ?? '',
        circuit_key: (s as any).circuit_key ?? 0,
        circuit_short_name: (s as any).circuit_short_name ?? '',
        gmt_offset: (s as any).gmt_offset ?? '',
        year: (s as any).year ?? 0
      })).sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    } catch {
      this.sessions = [];
    } finally {
      this.loadingSessions = false;
    }
  }

  async toggleSession(sessionKey: number) {
    if (this.expandedSessionKey === sessionKey) {
      this.expandedSessionKey = null;
      this.stopCurrentAudio();
      return;
    }
    this.expandedSessionKey = sessionKey;
    this.activeTab[sessionKey] ??= 'results';
    await this.loadTab(sessionKey, this.activeTab[sessionKey]);
  }

  async setActiveTab(sessionKey: number, tab: SessionTab) {
    this.activeTab[sessionKey] = tab;
    await this.loadTab(sessionKey, tab);
  }

  // I sorpassi esistono solo per le gare (anche sprint, che hanno session_type "Race")
  tabsFor(session: Session): { id: SessionTab; label: string }[] {
    return session.session_type === 'Race' ? this.sessionTabs : this.sessionTabs.filter(t => t.id !== 'overtakes');
  }

  /** true se il problema è la connessione all'API, false se il Gran Premio non esiste */
  get apiUnavailable(): boolean {
    return this.openF1Service.apiStatus() === 'error';
  }

  reload(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadMeeting(id);
  }

  isTabLoading(sessionKey: number, tab: SessionTab): boolean {
    return this.loadingTabs.has(`${sessionKey}:${tab}`);
  }

  // Scarica i dati di un tab la prima volta che viene aperto; chi lo richiede
  // mentre sta ancora caricando aspetta la stessa richiesta
  private loadTab(sessionKey: number, tab: SessionTab): Promise<void> {
    const id = `${sessionKey}:${tab}`;
    let request = this.tabRequests.get(id);
    if (!request) {
      request = this.fetchTab(sessionKey, tab, id);
      this.tabRequests.set(id, request);
    }
    return request;
  }

  private async fetchTab(sessionKey: number, tab: SessionTab, id: string): Promise<void> {
    this.loadingTabs.add(id);
    const orEmpty = <T>(request: Promise<T[]>): Promise<T[]> => request.catch(() => []);
    try {
      switch (tab) {
        case 'results':
          await this.loadResults(sessionKey);
          break;
        case 'telemetry': {
          const [stints] = await Promise.all([
            this.stints[sessionKey] ? Promise.resolve(this.stints[sessionKey]) : orEmpty(this.openF1Service.getStints(sessionKey)),
            this.loadTab(sessionKey, 'results')
          ]);
          this.stints[sessionKey] = stints;
          await this.initSessionTelemetry(sessionKey);
          break;
        }
        case 'stints': {
          // la posizione finale serve per ordinare i piloti
          const [stints] = await Promise.all([
            this.stints[sessionKey] ? Promise.resolve(this.stints[sessionKey]) : orEmpty(this.openF1Service.getStints(sessionKey)),
            this.loadTab(sessionKey, 'results')
          ]);
          this.stints[sessionKey] = stints;
          const grouped = this.groupStints(stints, this.sessionResultsNormalized[sessionKey] ?? []);
          this.groupedStints[sessionKey] = grouped;
          this.stintSummaries[sessionKey] = this.computeStintSummary(grouped);
          break;
        }
        case 'race_control': {
          this.raceControlMessages[sessionKey] = await orEmpty(this.openF1Service.getRaceControl(sessionKey));
          this.initRaceControlState(sessionKey);
          break;
        }
        case 'radio': {
          this.teamRadios[sessionKey] = await orEmpty(this.openF1Service.getTeamRadio(sessionKey));
          this.initRadioState(sessionKey);
          break;
        }
        case 'weather':
          this.weather[sessionKey] = await orEmpty(this.openF1Service.getWeather(sessionKey));
          this.filteredWeather[sessionKey] = this.filterWeather(this.weather[sessionKey]);
          break;
        case 'pits': {
          const pitsList = await orEmpty(this.openF1Service.getPits(sessionKey));
          this.pits[sessionKey] = pitsList;
          this.fastestPitBySession[sessionKey] = this.computeFastestPit(pitsList);
          break;
        }
        case 'overtakes':
          this.overtakes[sessionKey] = await orEmpty(this.openF1Service.getOvertakes(sessionKey));
          break;
      }
    } finally {
      this.loadingTabs.delete(id);
    }
  }

  // ---------- Direzione Gara (Race Control) Helpers ----------
  private initRaceControlState(sessionKey: number): void {
    if (!this.raceControlState[sessionKey]) {
      this.raceControlState[sessionKey] = {
        searchQuery: '',
        selectedFilter: 'all',
        selectedDriver: null
      };
    }
  }

  getFilteredRaceControlMessages(sessionKey: number): RaceControlMessage[] {
    const list = this.raceControlMessages[sessionKey] ?? [];
    const state = this.raceControlState[sessionKey] ?? {
      searchQuery: '',
      selectedFilter: 'all',
      selectedDriver: null
    };

    const query = state.searchQuery.trim().toLowerCase();

    return list.filter(msg => {
      // Filtro per pilota
      if (state.selectedDriver !== null && msg.driver_number !== state.selectedDriver) {
        return false;
      }

      // Filtro per tipologia / flag
      if (state.selectedFilter !== 'all') {
        const flag = (msg.flag || '').toUpperCase();
        const text = (msg.message || '').toUpperCase();
        const cat = (msg.category || '').toUpperCase();

        switch (state.selectedFilter) {
          case 'red_flag':
            if (flag !== 'RED' && !text.includes('RED FLAG')) return false;
            break;
          case 'safety_car':
            if (!text.includes('SAFETY CAR') || text.includes('VIRTUAL SAFETY CAR')) return false;
            break;
          case 'vsc':
            if (!text.includes('VIRTUAL SAFETY CAR') && !text.includes('VSC')) return false;
            break;
          case 'penalty':
            if (!text.includes('PENALTY') && !text.includes('INVESTIGAT') && !text.includes('DELETED')) return false;
            break;
          case 'drs':
            if (cat !== 'DRS' && !text.includes('DRS')) return false;
            break;
        }
      }

      // Filtro testuale
      if (query) {
        const driverName = msg.driver_number ? this.getDriverName(msg.driver_number).toLowerCase() : '';
        const driverTeam = msg.driver_number ? this.getDriverTeam(msg.driver_number).toLowerCase() : '';
        const text = (msg.message || '').toLowerCase();
        const flag = (msg.flag || '').toLowerCase();
        const cat = (msg.category || '').toLowerCase();
        if (
          !text.includes(query) &&
          !driverName.includes(query) &&
          !driverTeam.includes(query) &&
          !flag.includes(query) &&
          !cat.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  countRaceControlByFilter(sessionKey: number, filter: RaceControlFilter): number {
    const list = this.raceControlMessages[sessionKey] ?? [];
    if (filter === 'all') return list.length;
    return list.filter(msg => {
      const flag = (msg.flag || '').toUpperCase();
      const text = (msg.message || '').toUpperCase();
      const cat = (msg.category || '').toUpperCase();
      switch (filter) {
        case 'red_flag': return flag === 'RED' || text.includes('RED FLAG');
        case 'safety_car': return text.includes('SAFETY CAR') && !text.includes('VIRTUAL SAFETY CAR');
        case 'vsc': return text.includes('VIRTUAL SAFETY CAR') || text.includes('VSC');
        case 'penalty': return text.includes('PENALTY') || text.includes('INVESTIGAT') || text.includes('DELETED');
        case 'drs': return cat === 'DRS' || text.includes('DRS');
        default: return true;
      }
    }).length;
  }

  getRaceControlTagClass(msg: RaceControlMessage): string {
    const flag = (msg.flag || '').toUpperCase();
    const text = (msg.message || '').toUpperCase();
    const cat = (msg.category || '').toUpperCase();

    if (flag === 'RED' || text.includes('RED FLAG')) return 'rc-tag-red';
    if (text.includes('SAFETY CAR') && !text.includes('VIRTUAL SAFETY CAR')) return 'rc-tag-sc';
    if (text.includes('VIRTUAL SAFETY CAR') || text.includes('VSC')) return 'rc-tag-vsc';
    if (text.includes('PENALTY') || text.includes('INVESTIGAT')) return 'rc-tag-penalty';
    if (flag === 'YELLOW' || flag === 'DOUBLE YELLOW') return 'rc-tag-yellow';
    if (flag === 'GREEN') return 'rc-tag-green';
    if (flag === 'BLUE') return 'rc-tag-blue';
    if (flag === 'CHEQUERED') return 'rc-tag-chequered';
    if (flag === 'BLACK AND WHITE') return 'rc-tag-bw';
    if (cat === 'DRS' || text.includes('DRS')) return 'rc-tag-drs';
    return 'rc-tag-default';
  }

  getRaceControlTagLabel(msg: RaceControlMessage): string {
    const flag = (msg.flag || '').toUpperCase();
    const text = (msg.message || '').toUpperCase();
    const cat = (msg.category || '').toUpperCase();

    if (flag === 'RED' || text.includes('RED FLAG')) return 'Bandiera Rossa';
    if (text.includes('SAFETY CAR') && !text.includes('VIRTUAL SAFETY CAR')) return 'Safety Car';
    if (text.includes('VIRTUAL SAFETY CAR') || text.includes('VSC')) return 'VSC';
    if (text.includes('PENALTY')) return 'Penalità';
    if (text.includes('INVESTIGAT')) return 'Sotto Investigazione';
    if (flag === 'DOUBLE YELLOW') return 'Doppia Gialla';
    if (flag === 'YELLOW') return 'Bandiera Gialla';
    if (flag === 'GREEN') return 'Verde';
    if (flag === 'BLUE') return 'Bandiera Blu';
    if (flag === 'CHEQUERED') return 'Bandiera a Scacchi';
    if (flag === 'BLACK AND WHITE') return 'Bianco e Nera';
    if (cat === 'DRS' || text.includes('DRS')) return 'DRS';
    return msg.category || 'Avviso';
  }

  // ---------- Team Radio Helpers & Audio Player ----------
  private initRadioState(sessionKey: number): void {
    if (!this.radioState[sessionKey]) {
      this.radioState[sessionKey] = {
        searchQuery: '',
        selectedDriver: null,
        sortAscending: true,
        playingUrl: null,
        playingCurrentTime: 0,
        playingDuration: 0,
        isPlaying: false
      };
    }
  }

  getFilteredTeamRadios(sessionKey: number): TeamRadio[] {
    const list = this.teamRadios[sessionKey] ?? [];
    const state = this.radioState[sessionKey] ?? {
      searchQuery: '',
      selectedDriver: null,
      sortAscending: true,
      playingUrl: null,
      playingCurrentTime: 0,
      playingDuration: 0,
      isPlaying: false
    };

    const query = state.searchQuery.trim().toLowerCase();

    const filtered = list.filter(item => {
      if (state.selectedDriver !== null && item.driver_number !== state.selectedDriver) {
        return false;
      }
      if (query) {
        const name = this.getDriverName(item.driver_number).toLowerCase();
        const team = this.getDriverTeam(item.driver_number).toLowerCase();
        const num = String(item.driver_number);
        if (!name.includes(query) && !team.includes(query) && !num.includes(query)) {
          return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return state.sortAscending ? diff : -diff;
    });
  }

  toggleRadioSort(sessionKey: number): void {
    const state = this.radioState[sessionKey];
    if (state) {
      state.sortAscending = !state.sortAscending;
    }
  }

  togglePlayRadio(sessionKey: number, radio: TeamRadio): void {
    const state = this.radioState[sessionKey];
    if (!state) return;

    if (state.playingUrl === radio.recording_url && state.isPlaying) {
      this.currentAudioElement?.pause();
      state.isPlaying = false;
      return;
    }

    if (state.playingUrl === radio.recording_url && this.currentAudioElement) {
      this.currentAudioElement.play().catch(() => {});
      state.isPlaying = true;
      return;
    }

    this.stopCurrentAudio();

    const audio = new Audio(radio.recording_url);
    this.currentAudioElement = audio;
    this.currentAudioSessionKey = sessionKey;

    state.playingUrl = radio.recording_url;
    state.playingCurrentTime = 0;
    state.playingDuration = 0;
    state.isPlaying = true;

    audio.addEventListener('loadedmetadata', () => {
      if (state.playingUrl === radio.recording_url) {
        state.playingDuration = audio.duration || 0;
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (state.playingUrl === radio.recording_url) {
        state.playingCurrentTime = audio.currentTime || 0;
        if (!state.playingDuration && audio.duration) {
          state.playingDuration = audio.duration;
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (state.playingUrl === radio.recording_url) {
        state.isPlaying = false;
        state.playingCurrentTime = 0;
      }
    });

    audio.addEventListener('error', () => {
      if (state.playingUrl === radio.recording_url) {
        state.isPlaying = false;
      }
    });

    audio.play().catch(() => {
      state.isPlaying = false;
    });
  }

  seekRadio(sessionKey: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newTime = Number(input.value);
    const state = this.radioState[sessionKey];
    if (state && this.currentAudioElement && Number.isFinite(newTime)) {
      this.currentAudioElement.currentTime = newTime;
      state.playingCurrentTime = newTime;
    }
  }

  stopCurrentAudio(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    if (this.currentAudioSessionKey !== null) {
      const state = this.radioState[this.currentAudioSessionKey];
      if (state) {
        state.isPlaying = false;
        state.playingUrl = null;
        state.playingCurrentTime = 0;
        state.playingDuration = 0;
      }
      this.currentAudioSessionKey = null;
    }
  }

  formatAudioTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ---------- Telemetria e Confronto Tempi sul Giro ----------
  private async initSessionTelemetry(sessionKey: number): Promise<void> {
    if (!this.telemetryState[sessionKey]) {
      const ordered = this.getSessionOrderedDrivers(sessionKey);
      const driverA = ordered[0]?.driver_number ?? 1;
      const driverB = ordered[1]?.driver_number ?? (ordered[0]?.driver_number === 16 ? 1 : 16);

      this.telemetryState[sessionKey] = {
        driverANumber: driverA,
        driverBNumber: driverB,
        filterOutliers: true,
        lapsLoading: false,
        telemetryLoading: false,
        lapsByDriver: {},
        lapChart: null,
        activeLapIndex: 0,
        telemetryChart: null,
        activeTelemetryIndex: 50,
        telemetryLapA: null,
        telemetryLapB: null,
        customLapNumber: null
      };
    }

    await this.updateSessionTelemetryComparison(sessionKey, true);
  }

  async onTelemetryDriverChange(sessionKey: number, slot: 'A' | 'B', rawValue: number | string): Promise<void> {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    const newNumber = Number(rawValue);
    if (!Number.isFinite(newNumber)) return;

    if (slot === 'A') {
      if (newNumber === state.driverBNumber) {
        state.driverBNumber = state.driverANumber;
      }
      state.driverANumber = newNumber;
    } else {
      if (newNumber === state.driverANumber) {
        state.driverANumber = state.driverBNumber;
      }
      state.driverBNumber = newNumber;
    }

    state.customLapNumber = null;
    await this.updateSessionTelemetryComparison(sessionKey, true);
  }

  async swapTelemetryDrivers(sessionKey: number): Promise<void> {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    const tmp = state.driverANumber;
    state.driverANumber = state.driverBNumber;
    state.driverBNumber = tmp;
    await this.updateSessionTelemetryComparison(sessionKey, true);
  }

  toggleTelemetryOutliers(sessionKey: number): void {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    state.filterOutliers = !state.filterOutliers;
    this.rebuildLapChartOnly(sessionKey);
  }

  selectComparisonLap(sessionKey: number, rowIndex: number): void {
    const state = this.telemetryState[sessionKey];
    if (!state || !state.lapChart) return;
    if (rowIndex >= 0 && rowIndex < state.lapChart.rows.length) {
      state.activeLapIndex = rowIndex;
    }
  }

  selectTelemetrySample(sessionKey: number, sampleIndex: number): void {
    const state = this.telemetryState[sessionKey];
    if (!state || !state.telemetryChart) return;
    if (sampleIndex >= 0 && sampleIndex < state.telemetryChart.samples.length) {
      state.activeTelemetryIndex = sampleIndex;
    }
  }

  async loadTelemetryForLap(sessionKey: number, lapNumber: number | null): Promise<void> {
    const state = this.telemetryState[sessionKey];
    if (!state) return;
    state.customLapNumber = lapNumber;
    await this.loadFastestOrSelectedLapTelemetry(sessionKey);
  }

  getActiveLapRow(sessionKey: number): LapComparisonRow | null {
    const state = this.telemetryState[sessionKey];
    if (!state?.lapChart?.rows.length) return null;
    return state.lapChart.rows[state.activeLapIndex] ?? state.lapChart.rows[0];
  }

  getActiveTelemetrySample(sessionKey: number): TelemetryAlignedSample | null {
    const state = this.telemetryState[sessionKey];
    if (!state?.telemetryChart?.samples.length) return null;
    return state.telemetryChart.samples[state.activeTelemetryIndex] ?? state.telemetryChart.samples[0];
  }

  private rebuildLapChartOnly(sessionKey: number): void {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    const lapsA = state.lapsByDriver[state.driverANumber] ?? [];
    const lapsB = state.lapsByDriver[state.driverBNumber] ?? [];
    const stints = this.stints[sessionKey] ?? [];

    state.lapChart = buildLapComparisonChart(
      this.toTelemetryDriverInput(state.driverANumber),
      lapsA,
      this.toTelemetryDriverInput(state.driverBNumber),
      lapsB,
      stints,
      state.filterOutliers
    );

    if (state.lapChart && state.lapChart.rows.length) {
      if (state.activeLapIndex >= state.lapChart.rows.length) {
        state.activeLapIndex = state.lapChart.rows.length - 1;
      }
    }
  }

  async updateSessionTelemetryComparison(sessionKey: number, reloadTelemetry = true): Promise<void> {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    state.lapsLoading = true;
    try {
      const fetchDriverLaps = async (driverNum: number): Promise<LapData[]> => {
        if (!state.lapsByDriver[driverNum]) {
          state.lapsByDriver[driverNum] = await this.openF1Service.getLaps(sessionKey, driverNum).catch(() => []);
        }
        return state.lapsByDriver[driverNum];
      };

      const [lapsA, lapsB] = await Promise.all([
        fetchDriverLaps(state.driverANumber),
        fetchDriverLaps(state.driverBNumber)
      ]);

      const stints = this.stints[sessionKey] ?? [];
      state.lapChart = buildLapComparisonChart(
        this.toTelemetryDriverInput(state.driverANumber),
        lapsA,
        this.toTelemetryDriverInput(state.driverBNumber),
        lapsB,
        stints,
        state.filterOutliers
      );

      if (state.lapChart?.bestLapA) {
        const idx = state.lapChart.rows.findIndex(r => r.lapNumber === state.lapChart!.bestLapA!.lapNumber);
        state.activeLapIndex = idx >= 0 ? idx : 0;
      } else {
        state.activeLapIndex = 0;
      }
    } finally {
      state.lapsLoading = false;
    }

    if (reloadTelemetry) {
      await this.loadFastestOrSelectedLapTelemetry(sessionKey);
    }
  }

  private async loadFastestOrSelectedLapTelemetry(sessionKey: number): Promise<void> {
    const state = this.telemetryState[sessionKey];
    if (!state) return;

    const lapsA = state.lapsByDriver[state.driverANumber] ?? [];
    const lapsB = state.lapsByDriver[state.driverBNumber] ?? [];

    const winA = resolveLapTimeWindow(lapsA, state.customLapNumber ?? undefined);
    const winB = resolveLapTimeWindow(lapsB, state.customLapNumber ?? undefined);
    state.telemetryLapA = winA;
    state.telemetryLapB = winB;

    if (!winA && !winB) {
      state.telemetryChart = null;
      return;
    }

    state.telemetryLoading = true;
    try {
      const [telA, telB] = await Promise.all([
        winA
          ? this.openF1Service.getCarTelemetry(sessionKey, state.driverANumber, winA.startIso, winA.endIso).catch(() => [])
          : Promise.resolve([]),
        winB
          ? this.openF1Service.getCarTelemetry(sessionKey, state.driverBNumber, winB.startIso, winB.endIso).catch(() => [])
          : Promise.resolve([])
      ]);

      state.telemetryChart = buildTelemetryComparisonChart(
        this.toTelemetryDriverInput(state.driverANumber),
        telA,
        this.toTelemetryDriverInput(state.driverBNumber),
        telB
      );
      if (state.telemetryChart) {
        state.activeTelemetryIndex = Math.min(50, state.telemetryChart.samples.length - 1);
      }
    } finally {
      state.telemetryLoading = false;
    }
  }

  private async loadResults(sessionKey: number): Promise<void> {
    const results = await this.openF1Service.getResults(sessionKey).catch(() => [] as Result[]);
    this.sessionResultsNormalized[sessionKey] = this.normalizeResults(results);
  }

  private normalizeResults(results: Result[]): Result[] {
    // Associa team_name dai drivers se mancante
    const withTeam = results.map(r => {
      if (!r.team_name || r.team_name === '') {
        const found = this.drivers.find(d => d.driver_number === r.driver_number);
        if (found) {
          const teamName = (found as any).team_name ?? ((found as any).team || '');
          return { ...r, team_name: teamName } as Result;
        }
      }
      return r;
    });

    // Separiamo finiti, ritirati, dsq e dns
    const finished = withTeam.filter(r => !r.dnf && !r.dns && !r.dsq).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const dsq = withTeam.filter(r => r.dsq).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    const retired = withTeam.filter(r => r.dnf || r.dns).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

    // Etichettiamo lo stato in modo leggibile
    const dsqLabeled = dsq.map(r => ({ ...r, status: r.status || 'DSQ' }));
    const retiredLabeled = retired.map(r => ({ ...r, status: r.status || (r.dnf ? 'DNF' : (r.dns ? 'DNS' : 'RITIRO')) }));

    return [...finished, ...dsqLabeled, ...retiredLabeled];
  }
}
