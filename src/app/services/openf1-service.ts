import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Meeting } from '../models/meeting';
import { firstValueFrom } from 'rxjs';

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
  
  async getDrivers(sessionKey?: number): Promise<Driver[]> {
    const url = sessionKey
      ? `${this.baseUrl}/drivers?session_key=${sessionKey}`
      : `${this.baseUrl}/drivers`;
      
    const response = this.http.get<Driver[]>(url);
    return firstValueFrom(response);
  }
  
  async getSessions(meetingKey: number): Promise<Session[]> {
    const url = `${this.baseUrl}/sessions?meeting_key=${meetingKey}`;
    const response = this.http.get<Session[]>(url);
    return firstValueFrom(response);
  }
  
  async getResults(sessionKey: number): Promise<Result[]> {
    const url = `${this.baseUrl}/session_results?session_key=${sessionKey}`;
    const response = this.http.get<Result[]>(url);
    return firstValueFrom(response);
  }
}
