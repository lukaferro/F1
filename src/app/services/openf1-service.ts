import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
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

  async getMeetings(year?: number) : Promise<Meeting[]> {
    const url = year
      ? `${this.baseUrl}/meetings?year=${year}`
      : `${this.baseUrl}/meetings`;

      const response = this.http.get<Meeting[]>(url);
    return firstValueFrom(response);
  }

    async getMeeting(meetingKey: number): Promise<Session[]> {
    const url = `${this.baseUrl}/meetings?meeting_key=${meetingKey}`;
    const response = this.http.get<Session[]>(url);
    return firstValueFrom(response);
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

    const response = this.http.get<Driver[]>(url);
    return firstValueFrom(response);
  }

  // Additional useful endpoints that appear in the data samples the UI may consume.
  async getStartingGrid(sessionKey: number): Promise<StartingGrid[]> {
    const url = `${this.baseUrl}/starting_grid?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<StartingGrid[]>(url));
  }

  async getStints(sessionKey: number): Promise<Stint[]> {
    const url = `${this.baseUrl}/stints?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<Stint[]>(url));
  }

  async getTeamRadio(sessionKey: number): Promise<TeamRadio[]> {
    const url = `${this.baseUrl}/team_radio?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<TeamRadio[]>(url));
  }

  async getWeather(sessionKey: number): Promise<Weather[]> {
    const url = `${this.baseUrl}/weather?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<Weather[]>(url));
  }

  async getPits(sessionKey: number): Promise<Pit[]> {
    const url = `${this.baseUrl}/pits?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<Pit[]>(url));
  }

  async getPositions(sessionKey: number): Promise<Position[]> {
    const url = `${this.baseUrl}/positions?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<Position[]>(url));
  }

  async getOvertakes(sessionKey: number): Promise<Overtake[]> {
    const url = `${this.baseUrl}/overtakes?session_key=${sessionKey}`;
    return firstValueFrom(this.http.get<Overtake[]>(url));
  }
  
  async getSessions(meetingKey: number): Promise<Session[]> {
    const url = `${this.baseUrl}/sessions?meeting_key=${meetingKey}`;
    const response = this.http.get<Session[]>(url);
    return firstValueFrom(response);
  }
  
  async getResults(sessionKey: number): Promise<Result[]> {
    const url = `${this.baseUrl}/session_result?session_key=${sessionKey}`;
    const response = this.http.get<Result[]>(url);
    return firstValueFrom(response);
  }
}
