import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Meeting } from '../models/meeting';
import { HttpCache } from './http-cache';

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

export interface RaceControlMessage {
  meeting_key: number;
  session_key: number;
  date: string;
  driver_number: number | null;
  lap_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  qualifying_phase: number | null;
  message: string;
}

export interface LapData {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
}

export interface CarTelemetryPoint {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  rpm: number;
  drs: number;
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
  private readonly baseUrl = 'https://api.openf1.org/v1'; //base URL per le API di OpenF1

  // OpenF1 (piano gratuito) accetta 3 richieste al secondo e 30 al minuto: oltre risponde 429.
  // I dati legati a una sessione o a un GP non cambiano più (24 h); le liste generali
  // (calendario, griglia attuale) si riaggiornano dopo 30 minuti.
  private readonly cache = new HttpCache(inject(HttpClient), {
    prefix: 'openf1:',
    minGapMs: 350,
    maxPerWindow: 28, // margine sotto il limite di 30
    windowMs: 60_000,
    ttlFor: url => /(session_key|meeting_key)=\d/.test(url) ? 86_400_000 : 1_800_000
  });

  /** Stato dell'ultima chiamata a OpenF1 (ok / stale / error) */
  readonly apiStatus = this.cache.status;

  async getMeetings(year?: number) : Promise<Meeting[]> {
    const url = year
      ? `${this.baseUrl}/meetings?year=${year}`
      : `${this.baseUrl}/meetings`;

      return this.cache.get<Meeting[]>(url);
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

    return this.normalizeDrivers(await this.cache.getList<Driver>(url));
  }

  /** Piloti dell'ultima sessione disputata (formazione attuale) */
  async getLatestDrivers(): Promise<Driver[]> {
    return this.normalizeDrivers(await this.cache.get<Driver[]>(`${this.baseUrl}/drivers?session_key=latest`));
  }

  // L'API chiama il colore "team_colour": lo copiamo in team_color, usato in tutta l'app
  private normalizeDrivers(drivers: Driver[]): Driver[] {
    return drivers.map(d => ({ ...d, team_color: d.team_color || d.team_colour || '' }));
  }

  // L'API restituisce una riga per ogni sessione disputata, dalla più vecchia: prendiamo la più recente
  async getDriverByNumber(driverNumber: number): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?driver_number=${driverNumber}`;
    const list = this.normalizeDrivers(await this.cache.getList<Driver>(url));
    return list.length ? list[list.length - 1] : null;
  }

  async getDriverByAcronym(acronym: string): Promise<Driver | null> {
    const url = `${this.baseUrl}/drivers?name_acronym=${acronym.toUpperCase()}`;
    const list = this.normalizeDrivers(await this.cache.getList<Driver>(url));
    return list.length ? list[list.length - 1] : null;
  }

  // Dati delle singole sessioni: se l'API non li ha (404) arriva una lista vuota
  async getStints(sessionKey: number): Promise<Stint[]> {
    return this.cache.getList<Stint>(`${this.baseUrl}/stints?session_key=${sessionKey}`);
  }

  async getTeamRadio(sessionKey: number): Promise<TeamRadio[]> {
    return this.cache.getList<TeamRadio>(`${this.baseUrl}/team_radio?session_key=${sessionKey}`);
  }

  async getRaceControl(sessionKey: number): Promise<RaceControlMessage[]> {
    return this.cache.getList<RaceControlMessage>(`${this.baseUrl}/race_control?session_key=${sessionKey}`);
  }

  async getWeather(sessionKey: number): Promise<Weather[]> {
    return this.cache.getList<Weather>(`${this.baseUrl}/weather?session_key=${sessionKey}`);
  }

  async getPits(sessionKey: number): Promise<Pit[]> {
    return this.cache.getList<Pit>(`${this.baseUrl}/pit?session_key=${sessionKey}`);
  }

  async getOvertakes(sessionKey: number): Promise<Overtake[]> {
    return this.cache.getList<Overtake>(`${this.baseUrl}/overtakes?session_key=${sessionKey}`);
  }

  async getLaps(sessionKey: number, driverNumber?: number): Promise<LapData[]> {
    const driverFilter = typeof driverNumber === 'number' ? `&driver_number=${driverNumber}` : '';
    return this.cache.getList<LapData>(`${this.baseUrl}/laps?session_key=${sessionKey}${driverFilter}`);
  }

  async getCarTelemetry(
    sessionKey: number,
    driverNumber: number,
    dateStartIso: string,
    dateEndIso: string
  ): Promise<CarTelemetryPoint[]> {
    const url = `${this.baseUrl}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${dateStartIso}&date<=${dateEndIso}`;
    return this.cache.getList<CarTelemetryPoint>(url);
  }

  /** Tutte le gare (session_name = Race) di tutte le stagioni, con una sola richiesta */
  async getRaceSessions(): Promise<Session[]> {
    return this.cache.getList<Session>(`${this.baseUrl}/sessions?session_name=Race`);
  }

  async getSessions(meetingKey: number): Promise<Session[]> {
    return this.cache.getList<Session>(`${this.baseUrl}/sessions?meeting_key=${meetingKey}`);
  }

  async getResults(sessionKey: number): Promise<Result[]> {
    return this.cache.getList<Result>(`${this.baseUrl}/session_result?session_key=${sessionKey}`);
  }
}
