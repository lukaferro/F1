import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Meeting } from '../models/meeting';
import { firstValueFrom } from 'rxjs';

export interface StartingGrid {
  position: number;
  driver_number: number;
  lap_duration: number;
  meeting_key: number;
  session_key: number;
}

export interface Stint {
  compound: string;
  driver_number: number;
  lap_start: number;
  lap_end: number;
  meeting_key: number;
  session_key: number;
  stint_number: number;
  tyre_age_at_start: number;
}

export interface TeamRadio {
  date: string;
  driver_number: number;
  meeting_key: number;
  recording_url: string;
  session_key: number;
}

export interface Weather {
  air_temperature: number;
  date: string;
  humidity: number;
  meeting_key: number;
  pressure: number;
  rainfall: number;
  session_key: number;
  track_temperature: number;
  wind_direction: number;
  wind_speed: number;
}

export interface Pit {
  date: string;
  driver_number: number;
  lap_number: number;
  meeting_key: number;
  pit_duration: number;
  session_key: number;
}

export interface Position {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface Overtake {
  date: string;
  meeting_key: number;
  overtaken_driver_number: number;
  overtaking_driver_number: number;
  position: number;
  session_key: number;
}

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_color: string;
  team_colour?: string; // nome del campo nell'API OpenF1
  first_name: string;
  last_name: string;
  country_code: string;
  headshot_url?: string;
}

export interface Session {
  id: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
}

export interface Result {
  driver_number: number;
  broadcast_name: string;
  position: number;
  grid_position: number;
  status: string;
  points: number;
  lap_time_millis?: number;
  lap_time?: string;
  gap_to_leader?: string;
  interval_to_position_ahead?: string;
  team_name: string;
  team_color: string;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  number_of_laps?: number;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class Openf1ServiceService {
  private readonly http = inject(HttpClient); //importare funzionalità per chiamate HTTP
  private readonly baseUrl = 'https://api.openf1.org/v1'; //base URL per le API di OpenF1
  private readonly cachePrefix = 'openf1:';
  private readonly cacheTtlMs = 30 * 60 * 1000; // dopo 30 minuti la cache viene riaggiornata dall'API

  /**
   * Stato dell'ultima chiamata all'API:
   * - 'ok': dati aggiornati
   * - 'stale': API non raggiungibile, mostriamo dati salvati in cache
   * - 'error': API non raggiungibile e nessun dato in cache
   */
  readonly apiStatus = signal<'ok' | 'stale' | 'error'>('ok');

  // GET con cache in localStorage: usa la cache se recente, altrimenti chiama l'API
  // e, se l'API fallisce (es. sessione live in corso), ripiega sulla cache anche se vecchia.
  private async get<T>(url: string): Promise<T> {
    const key = this.cachePrefix + url;
    const cached = this.readCache<T>(key);
    if (cached && Date.now() - cached.savedAt < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const data = await this.fetchWithRetry<T>(url);
      this.writeCache(key, data);
      this.apiStatus.set('ok');
      return data;
    } catch (err) {
      // 404 = l'API non ha quel dato (es. sorpassi di una sessione): non è un problema di connessione
      if (err instanceof HttpErrorResponse && err.status === 404) {
        throw err;
      }
      if (cached) {
        this.apiStatus.set('stale');
        return cached.data;
      }
      this.apiStatus.set('error');
      throw err;
    }
  }

  // OpenF1 accetta circa 3 richieste al secondo: oltre risponde 429 e i dati mancano.
  // Le richieste partono quindi in fila, distanziate, e quelle rifiutate vengono ritentate.
  private readonly minRequestGapMs = 350;
  private readonly retryDelaysMs = [1000, 2000, 4000];
  private nextRequestAt = 0;

  private async fetchWithRetry<T>(url: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.waitForRequestSlot();
      try {
        return await firstValueFrom(this.http.get<T>(url));
      } catch (err) {
        // 429 = troppe richieste; 0 = nessuna risposta leggibile (il 429 di OpenF1 può arrivare senza header CORS)
        // Se l'API è già risultata irraggiungibile (es. sessione live) non insistiamo: l'avviso compare subito
        const retryable = err instanceof HttpErrorResponse
          && (err.status === 429 || (err.status === 0 && this.apiStatus() !== 'error'));
        if (!retryable || attempt >= this.retryDelaysMs.length) throw err;
        await new Promise(resolve => setTimeout(resolve, this.retryDelaysMs[attempt]));
      }
    }
  }

  private async waitForRequestSlot(): Promise<void> {
    const now = Date.now();
    const startAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = startAt + this.minRequestGapMs;
    if (startAt > now) {
      await new Promise(resolve => setTimeout(resolve, startAt - now));
    }
  }

  private readCache<T>(key: string): { savedAt: number; data: T } | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private writeCache(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      // localStorage pieno o non disponibile: svuotiamo la nostra cache e andiamo avanti senza
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.cachePrefix))
          .forEach(k => localStorage.removeItem(k));
      } catch { /* ignorato */ }
    }
  }

  async getMeetings(year?: number) : Promise<Meeting[]> {
    const url = year
      ? `${this.baseUrl}/meetings?year=${year}`
      : `${this.baseUrl}/meetings`;

      return this.get<Meeting[]>(url);
  }

    async getMeeting(meetingKey: number): Promise<Session[]> {
    const url = `${this.baseUrl}/meetings?meeting_key=${meetingKey}`;
    return this.get<Session[]>(url);
  }
  
  /**
   * Get drivers. By default treats the numeric key as meeting_key. If you need to fetch by session_key,
   * pass type = 'session'.
   */
  async getDrivers(key?: number, type: 'meeting' | 'session' = 'meeting'): Promise<Driver[]> {
    let url = `${this.baseUrl}/drivers`;
    if (typeof key === 'number') {
      url = type === 'session'
        ? `${this.baseUrl}/drivers?session_key=${key}`
        : `${this.baseUrl}/drivers?meeting_key=${key}`;
    }

    return this.normalizeDrivers(await this.get<Driver[]>(url));
  }

  /** Piloti dell'ultima sessione disputata (formazione attuale) */
  async getLatestDrivers(): Promise<Driver[]> {
    return this.normalizeDrivers(await this.get<Driver[]>(`${this.baseUrl}/drivers?session_key=latest`));
  }

  // L'API chiama il colore "team_colour": lo copiamo in team_color, usato in tutta l'app
  private normalizeDrivers(drivers: Driver[]): Driver[] {
    return drivers.map(d => ({ ...d, team_color: d.team_color || d.team_colour || '' }));
  }

  async getDriverByNumber(driverNumber: number): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?driver_number=${driverNumber}`;
    const list = this.normalizeDrivers(await this.get<Driver[]>(url));
    return list && list.length ? list[0] : null;
  }

  async getDriverByAcronym(acronym: string): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?name_acronym=${acronym.toUpperCase()}`;
    const list = this.normalizeDrivers(await this.get<Driver[]>(url));
    return list && list.length ? list[0] : null;
  }

  async getDriverByFullName(fullName: string): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?full_name=${encodeURIComponent(fullName)}`;
    const list = this.normalizeDrivers(await this.get<Driver[]>(url));
    return list && list.length ? list[0] : null;
  }

  // Additional useful endpoints that appear in the data samples the UI may consume.
  async getStartingGrid(sessionKey: number): Promise<StartingGrid[]> {
    const url = `${this.baseUrl}/starting_grid?session_key=${sessionKey}`;
    return this.get<StartingGrid[]>(url);
  }

  async getStints(sessionKey: number): Promise<Stint[]> {
    const url = `${this.baseUrl}/stints?session_key=${sessionKey}`;
    return this.get<Stint[]>(url);
  }

  async getTeamRadio(sessionKey: number): Promise<TeamRadio[]> {
    const url = `${this.baseUrl}/team_radio?session_key=${sessionKey}`;
    return this.get<TeamRadio[]>(url);
  }

  async getWeather(sessionKey: number): Promise<Weather[]> {
    const url = `${this.baseUrl}/weather?session_key=${sessionKey}`;
    return this.get<Weather[]>(url);
  }

  async getPits(sessionKey: number): Promise<Pit[]> {
    const url = `${this.baseUrl}/pits?session_key=${sessionKey}`;
    return this.get<Pit[]>(url);
  }

  async getPositions(sessionKey: number): Promise<Position[]> {
    const url = `${this.baseUrl}/positions?session_key=${sessionKey}`;
    return this.get<Position[]>(url);
  }

  async getOvertakes(sessionKey: number): Promise<Overtake[]> {
    const url = `${this.baseUrl}/overtakes?session_key=${sessionKey}`;
    return this.get<Overtake[]>(url);
  }
  
  async getSessions(meetingKey: number): Promise<Session[]> {
    const url = `${this.baseUrl}/sessions?meeting_key=${meetingKey}`;
    return this.get<Session[]>(url);
  }
  
  async getResults(sessionKey: number): Promise<Result[]> {
    const url = `${this.baseUrl}/session_result?session_key=${sessionKey}`;
    return this.get<Result[]>(url);
  }
}
