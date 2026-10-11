import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { Meeting } from '../../models/meeting';
import { 
  Openf1ServiceService, 
  Driver, 
  Result,
  Stint,
  TeamRadio,
  Weather,
  Pit,
  Position,
  Overtake 
} from '../../services/openf1-service';
import { Session } from '../../models/session';
import { circuitMapUrl, SponsorInfo, titleSponsor } from '../../utils/f1-media';


@Component({
  selector: 'app-gran-premi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TabViewModule, TableModule],
  templateUrl: './gran-premi-detail.component.html',
  styleUrl: './gran-premi-detail.component.css'
})
export class GranPremiDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly openF1Service = inject(Openf1ServiceService);
  
  meeting: Meeting | null = null;
  loading = true;
  error?: string;
  
  drivers: Driver[] = [];
  sessions: Session[] = [];
  sessionResults: { [session_key: number]: Result[] } = {};
  sessionResultsNormalized: { [session_key: number]: Result[] } = {};
  expandedSessionKey: number | null = null;
  raceResults: Result[] = [];
  qualifyingResults: Result[] = [];
  sprintResults: Result[] = [];
  sessionResultsTable: Array<Result & { sessionLabel: string }> = [];

  // Additional session data
  stints: { [session_key: number]: Stint[] } = {};
  teamRadios: { [session_key: number]: TeamRadio[] } = {};
  weather: { [session_key: number]: Weather[] } = {};
  pits: { [session_key: number]: Pit[] } = {};
  positions: { [session_key: number]: Position[] } = {};
  overtakes: { [session_key: number]: Overtake[] } = {};
  activeTab: { [session_key: number]: string } = {};
  
  loadingSessions = false;
  loadingResults = false;
  sessionsError?: string;
  resultsError?: string;
  
  activeSessionIndex = 0;

  currentSponsor?: SponsorInfo;

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
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(3).padStart(6, '0');
    return `${minutes}:${remainder}`;
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

  getDriverTeam(driverNumber: number): string {
    const driver = this.drivers.find(d => d.driver_number === driverNumber);
    return driver?.team_name || 'Unknown Team';
  }

  // Filtra i dati meteo per mostrare solo quelli ogni 30 minuti
  getFilteredWeather(sessionKey: number): Weather[] {
    const weatherData = this.weather[sessionKey];
    if (!weatherData || weatherData.length === 0) return [];

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

  // Raggruppa gli stint per pilota con la loro posizione finale
  getGroupedStints(sessionKey: number): any[] {
    const stintsData = this.stints[sessionKey];
    const results = this.sessionResultsNormalized[sessionKey];
    
    if (!stintsData || !results) return [];

    // Crea una mappa dei piloti con i loro stint
    const driverStintsMap = new Map<number, any>();

    stintsData.forEach(stint => {
      if (!driverStintsMap.has(stint.driver_number)) {
        // Trova la posizione finale del pilota
        const result = results.find(r => r.driver_number === stint.driver_number);
        driverStintsMap.set(stint.driver_number, {
          driver_number: stint.driver_number,
          position: result?.position || 999,
          stints: []
        });
      }
      driverStintsMap.get(stint.driver_number).stints.push(stint);
    });

    // Converti la mappa in array e ordina per posizione
    const grouped = Array.from(driverStintsMap.values()).sort((a, b) => a.position - b.position);

    // Ordina gli stint di ogni pilota per numero stint
    grouped.forEach(driver => {
      driver.stints.sort((a: Stint, b: Stint) => a.stint_number - b.stint_number);
    });

    return grouped;
  }
  
  private async loadMeeting(id: number) {
    this.loading = true;
    this.error = undefined;

    try {
      const meetings = await this.openF1Service.getMeetings();
      const list: Meeting[] = Array.isArray(meetings)
        ? meetings as Meeting[]
        : (meetings && Array.isArray((meetings as any).data) ? (meetings as any).data as Meeting[] : []);

      this.meeting = list.find((m: Meeting) => m.meeting_key === id) || null;

      if (!this.meeting) {
        this.error = 'Gran Premio non trovato';
        return;
      }

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
      
      // Ensure we have team colors for all teams
      const teamColors: { [key: string]: string } = {
        'Red Bull Racing': '1D19AC',
        'Mercedes': '00D7B6',
        'Ferrari': 'ED1131',
        'McLaren': 'F47600',
        'Aston Martin': '229971',
        'Alpine': '00A1E8',
        'AlphaTauri': '6C98FF',
        'Alfa Romeo': 'C92D4B',
        'Haas F1 Team': '9C9FA2',
        'Williams': '1868DB',
        'Kick Sauber': '01C00E',
        'Racing Bulls': '6C98FF',
        'Audi': 'F50537',
        'Cadillac': '909090'
      };
      
      // Apply default team colors if missing
      this.drivers = this.drivers.map(driver => ({
        ...driver,
        team_color: driver.team_color || teamColors[driver.team_name] || 'FFFFFF'
      }));

      // Drivers caricati e normalizzati
    } catch (err) {
      // Errore nel caricamento dei piloti
    }
  }
  
  private async loadSessions(meetingKey: number) {
    this.loadingSessions = true;
    this.sessionsError = undefined;
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

      for (let i = 0; i < this.sessions.length; i += 3) {
        const chunk = this.sessions.slice(i, i + 3);
        await Promise.all(chunk.map(async session => {
          try {
            const results = await this.openF1Service.getResults(session.session_key);
            this.sessionResults[session.session_key] = Array.isArray(results) ? results.sort((a, b) => a.position - b.position) : [];
          } catch (err) {
            this.sessionResults[session.session_key] = [];
          }
        }));
        if (i + 3 < this.sessions.length) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
      // Dopo aver caricato i risultati per sessione, costruisci gli array per le tab
      this.buildSessionResultArrays();
    } catch (err: any) {
      this.sessionsError = err?.message || 'Errore caricamento sessioni';
    } finally {
      this.loadingSessions = false;
    }
  }

  private buildSessionResultArrays() {
    this.raceResults = [];
    this.qualifyingResults = [];
    this.sprintResults = [];
    this.sessionResultsTable = [];

    const sorted = [...this.sessions].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    for (const session of sorted) {
      const raw = this.sessionResults[session.session_key] ?? [];
      const label = this.getSessionName(session);

      // Normalizza: unisci team dal listato drivers, e metti i ritirati in fondo
      const normalized = this.normalizeResults(raw);
      this.sessionResultsNormalized[session.session_key] = normalized;

      // Popola la tabella compatta di overview
      if (normalized.length) {
        this.sessionResultsTable.push(...normalized.map(r => ({ ...r, sessionLabel: label })));
      }

      // Classificazione in Race / Qualifying / Sprint usando session_name e session_type
      const nameLower = (session.session_name || '').toLowerCase();
      const type = (session.session_type || '').toLowerCase();

      if (nameLower.includes('sprint') && type.includes('qual')) {
        // Sprint Shootout / Sprint Qualifying
        this.sprintResults.push(...normalized);
      } else if (nameLower.includes('sprint') && type.includes('race')) {
        // Sprint Race
        this.sprintResults.push(...normalized);
      } else if (type === 'race' && !nameLower.includes('sprint')) {
        this.raceResults.push(...normalized);
      } else if (type.includes('qual') && !nameLower.includes('sprint')) {
        this.qualifyingResults.push(...normalized);
      }
    }
  }

  async toggleSession(sessionKey: number) {
    if (this.expandedSessionKey === sessionKey) {
      this.expandedSessionKey = null;
      return;
    }
    
    this.expandedSessionKey = sessionKey;
    this.activeTab[sessionKey] = 'results';  // default tab
    
    // Load all session data in parallel
    try {
      const [
        stints,
        teamRadio,
        weather,
        pits,
        positions,
        overtakes
      ] = await Promise.all([
        this.openF1Service.getStints(sessionKey),
        this.openF1Service.getTeamRadio(sessionKey),
        this.openF1Service.getWeather(sessionKey),
        this.openF1Service.getPits(sessionKey),
        this.openF1Service.getPositions(sessionKey),
        this.openF1Service.getOvertakes(sessionKey)
      ]);

      // Store results in session-specific collections
      this.stints[sessionKey] = stints;
      this.teamRadios[sessionKey] = teamRadio;
      this.weather[sessionKey] = weather;
      this.pits[sessionKey] = pits;
      this.positions[sessionKey] = positions;
      this.overtakes[sessionKey] = overtakes;

    } catch (err) {
      // Errore nel caricamento dei dettagli della sessione
    }
  }

  setActiveTab(sessionKey: number, tab: string) {
    this.activeTab[sessionKey] = tab;
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
  
  // loadAllSessionResults non più necessario: la logica è ora in loadSessions
  
  private getResultsBySessionType(type: Session['session_type']): Result[] {
    // Cerca la prima sessione di quel tipo e restituisce i risultati
    const session = this.sessions.find(s => s.session_type === type);
    if (session && this.sessionResults[session.session_key]) {
      return this.sessionResults[session.session_key];
    }
    return [];
  }
}
