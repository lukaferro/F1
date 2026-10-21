import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { Meeting } from '../../models/meeting';
import { smallFlagUrl } from '../../utils/country-flags';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ButtonModule, CardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;

  seasonYear = new Date().getFullYear();
  grandPrixCount: string | number = '—';
  driversCount: string | number = '—';
  teamsCount: string | number = '—';
  countriesCount: string | number = '—';

  nextMeeting: Meeting | null = null;
  isUpcoming = false;
  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };
  private timerInterval?: any;

  private readonly openF1 = inject(Openf1ServiceService);

  async ngOnInit() {
    await this.loadSeasonStats();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  ngAfterViewInit(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) {
      return;
    }
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    // play() non restituisce sempre una Promise (browser datati, ambiente dei test)
    video.play()?.catch(() => {});
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

      // Calcolo del prossimo Gran Premio (o ultimo disputato)
      if (meetingsToUse.length > 0) {
        const now = Date.now();
        const sorted = [...meetingsToUse].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        const upcoming = sorted.filter(m => new Date(m.date_start).getTime() + (3 * 86_400_000) >= now);

        if (upcoming.length > 0) {
          this.nextMeeting = upcoming[0];
          this.isUpcoming = true;
          this.updateCountdown();
          this.startCountdownTimer();
        } else {
          this.nextMeeting = sorted[sorted.length - 1];
          this.isUpcoming = false;
        }
      }

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

  private startCountdownTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  updateCountdown(): void {
    if (!this.nextMeeting || !this.isUpcoming) return;
    const now = Date.now();
    const target = new Date(this.nextMeeting.date_start).getTime();
    const diff = target - now;

    if (diff <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }

    this.countdown = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60)
    };
  }

  /** Mostra il pulsante "Dettagli Gran Premio" solo se il weekend di gara è già iniziato o concluso */
  get canViewNextMeetingDetails(): boolean {
    if (!this.nextMeeting) return false;
    return new Date(this.nextMeeting.date_start).getTime() <= Date.now();
  }

  getFlag(countryCode?: string): string {
    return smallFlagUrl(countryCode);
  }
}
