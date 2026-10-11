import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { Meeting } from '../../models/meeting';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnInit {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;

  seasonYear = new Date().getFullYear();
  grandPrixCount: string | number = '—';
  driversCount: string | number = '—';
  teamsCount: string | number = '—';
  countriesCount: string | number = '—';

  private readonly openF1 = inject(Openf1ServiceService);

  async ngOnInit() {
    await this.loadSeasonStats();
  }

  ngAfterViewInit(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) {
      return;
    }
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.play().catch(() => {});
  }

  private async loadSeasonStats() {
    try {
      const meetings: Meeting[] = await this.openF1.getMeetings(this.seasonYear);
      const seasonMeetings = Array.isArray(meetings) ? meetings.filter(m => m.year === this.seasonYear) : [];
      const meetingsToUse = seasonMeetings.length ? seasonMeetings : meetings;

      this.grandPrixCount = meetingsToUse.length || '—';

      const countries = new Set<string>();
      meetingsToUse.forEach(m => {
        if (m.country_code) {
          countries.add(m.country_code);
        }
      });
      this.countriesCount = countries.size || (meetingsToUse.length ? '—' : 'N/D');

      // Prova a ricavare piloti e team dal primo meeting disponibile
      const referenceMeeting = meetingsToUse[0];
      if (referenceMeeting) {
        const drivers: Driver[] = await this.openF1.getDrivers(referenceMeeting.meeting_key, 'meeting');
        const uniqueDrivers = new Map<number, Driver>();
        const teams = new Set<string>();
        drivers.forEach(d => {
          uniqueDrivers.set(d.driver_number, d);
          if (d.team_name) {
            teams.add(d.team_name);
          }
        });
        this.driversCount = uniqueDrivers.size || '—';
        this.teamsCount = teams.size || '—';
      }
    } catch {
      // Lascia valori di fallback
    }
  }
}
