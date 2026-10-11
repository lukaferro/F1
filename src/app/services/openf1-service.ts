import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Meeting } from '../models/meeting';
import { firstValueFrom } from 'rxjs';

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
  session_key: number;
  meeting_key: number;
  year?: number;
  is_cancelled?: boolean;
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
  // Liste generali (calendario, griglia attuale) possono cambiare: si riaggiornano dopo 30 minuti
  private readonly shortTtlMs = 30 * 60 * 1000;
  // Dati legati a una sessione o a un GP specifico non cambiano più una volta finiti
  private readonly longTtlMs = 24 * 60 * 60 * 1000;
  // Risposte più grandi non vengono salvate nel localStorage (limite ~5MB per sito)
  private readonly maxCachedChars = 400_000;

  // Cache in memoria (evita di rileggere e decodificare il localStorage a ogni chiamata)
  private readonly memoryCache = new Map<string, { savedAt: number; data: unknown }>();
  // Richieste già partite: chi chiede lo stesso URL nel frattempo aspetta la stessa risposta
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Stato dell'ultima chiamata all'API:
   * - 'ok': dati aggiornati
   * - 'stale': API non raggiungibile, mostriamo dati salvati in cache
   * - 'error': API non raggiungibile e nessun dato in cache
   */
  readonly apiStatus = signal<'ok' | 'stale' | 'error'>('ok');

  // GET con cache: usa la cache se recente, altrimenti chiama l'API
  // e, se l'API fallisce (es. sessione live in corso), ripiega sulla cache anche se vecchia.
  private get<T>(url: string): Promise<T> {
    const pending = this.inFlight.get(url);
    if (pending) return pending as Promise<T>;

    const request = this.load<T>(url).finally(() => this.inFlight.delete(url));
    this.inFlight.set(url, request);
    return request;
  }

  /** Come get, ma se l'API non ha quel dato (404) restituisce una lista vuota */
  private async getList<T>(url: string): Promise<T[]> {
    try {
      return await this.get<T[]>(url);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return [];
      throw err;
    }
  }

  private ttlFor(url: string): number {
    return /(session_key|meeting_key)=\d/.test(url) ? this.longTtlMs : this.shortTtlMs;
  }

  private async load<T>(url: string): Promise<T> {
    const key = this.cachePrefix + url;
    const cached = (this.memoryCache.get(key) ?? this.readCache<T>(key)) as { savedAt: number; data: T } | null;
    if (cached && Date.now() - cached.savedAt < this.ttlFor(url)) {
      this.memoryCache.set(key, cached);
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

  // OpenF1 (piano gratuito) accetta 3 richieste al secondo e 30 al minuto: oltre risponde 429.
  // Le richieste partono quindi in fila rispettando entrambi i limiti; le poche rifiutate
  // (es. altre schede aperte sulla stessa rete) vengono ritentate.
  private readonly minRequestGapMs = 350;
  private readonly maxRequestsPerMinute = 28; // margine sotto il limite di 30
  private readonly retryDelaysMs = [2000, 8000, 20000];
  private readonly scheduledRequests: number[] = []; // orari di partenza, in ordine

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
    const minute = 60_000;
    while (this.scheduledRequests.length && this.scheduledRequests[0] <= now - minute) {
      this.scheduledRequests.shift();
    }

    const last = this.scheduledRequests[this.scheduledRequests.length - 1] ?? 0;
    let startAt = Math.max(now, last + this.minRequestGapMs);
    // Già 28 richieste nell'ultimo minuto: aspettiamo che la più vecchia esca dalla finestra
    if (this.scheduledRequests.length >= this.maxRequestsPerMinute) {
      const oldestInWindow = this.scheduledRequests[this.scheduledRequests.length - this.maxRequestsPerMinute];
      startAt = Math.max(startAt, oldestInWindow + minute);
    }
    this.scheduledRequests.push(startAt);

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
    const entry = { savedAt: Date.now(), data };
    this.memoryCache.set(key, entry);

    const json = JSON.stringify(entry);
    if (json.length > this.maxCachedChars) return;
    try {
      localStorage.setItem(key, json);
    } catch {
      // localStorage pieno: liberiamo le voci più vecchie e riproviamo una volta
      this.evictOldest();
      try { localStorage.setItem(key, json); } catch { /* resta solo in memoria */ }
    }
  }

  private evictOldest(): void {
    try {
      const entries = Object.keys(localStorage)
        .filter(k => k.startsWith(this.cachePrefix))
        .map(k => ({ k, savedAt: this.readCache(k)?.savedAt ?? 0 }))
        .sort((a, b) => a.savedAt - b.savedAt);
      entries.slice(0, Math.ceil(entries.length / 2)).forEach(e => localStorage.removeItem(e.k));
    } catch { /* ignorato */ }
  }

  async getMeetings(year?: number) : Promise<Meeting[]> {
    const url = year
      ? `${this.baseUrl}/meetings?year=${year}`
      : `${this.baseUrl}/meetings`;

      return this.get<Meeting[]>(url);
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

    return this.normalizeDrivers(await this.getList<Driver>(url));
  }

  /** Piloti dell'ultima sessione disputata (formazione attuale) */
  async getLatestDrivers(): Promise<Driver[]> {
    return this.normalizeDrivers(await this.get<Driver[]>(`${this.baseUrl}/drivers?session_key=latest`));
  }

  // L'API chiama il colore "team_colour": lo copiamo in team_color, usato in tutta l'app
  private normalizeDrivers(drivers: Driver[]): Driver[] {
    return drivers.map(d => ({ ...d, team_color: d.team_color || d.team_colour || '' }));
  }

  // L'API restituisce una riga per ogni sessione disputata, dalla più vecchia: prendiamo la più recente
  async getDriverByNumber(driverNumber: number): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?driver_number=${driverNumber}`;
    const list = this.normalizeDrivers(await this.getList<Driver>(url));
    return list.length ? list[list.length - 1] : null;
  }

  async getDriverByAcronym(acronym: string): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?name_acronym=${acronym.toUpperCase()}`;
    const list = this.normalizeDrivers(await this.getList<Driver>(url));
    return list.length ? list[list.length - 1] : null;
  }

  // Dati delle singole sessioni: se l'API non li ha (404) arriva una lista vuota
  async getStints(sessionKey: number): Promise<Stint[]> {
    return this.getList<Stint>(`${this.baseUrl}/stints?session_key=${sessionKey}`);
  }

  async getTeamRadio(sessionKey: number): Promise<TeamRadio[]> {
    return this.getList<TeamRadio>(`${this.baseUrl}/team_radio?session_key=${sessionKey}`);
  }

  async getWeather(sessionKey: number): Promise<Weather[]> {
    return this.getList<Weather>(`${this.baseUrl}/weather?session_key=${sessionKey}`);
  }

  async getPits(sessionKey: number): Promise<Pit[]> {
    return this.getList<Pit>(`${this.baseUrl}/pit?session_key=${sessionKey}`);
  }

  async getOvertakes(sessionKey: number): Promise<Overtake[]> {
    return this.getList<Overtake>(`${this.baseUrl}/overtakes?session_key=${sessionKey}`);
  }

  /** Tutte le gare (session_name = Race) di tutte le stagioni, con una sola richiesta */
  async getRaceSessions(): Promise<Session[]> {
    return this.getList<Session>(`${this.baseUrl}/sessions?session_name=Race`);
  }

  async getSessions(meetingKey: number): Promise<Session[]> {
    return this.getList<Session>(`${this.baseUrl}/sessions?meeting_key=${meetingKey}`);
  }

  async getResults(sessionKey: number): Promise<Result[]> {
    return this.getList<Result>(`${this.baseUrl}/session_result?session_key=${sessionKey}`);
  }
}
