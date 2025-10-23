import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Meeting } from '../models/meeting';
import { firstValueFrom } from 'rxjs';

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
}
