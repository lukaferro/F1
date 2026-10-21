import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { NewsService, F1NewsArticle } from '../../services/news.service';
import { Meeting } from '../../models/meeting';
import { smallFlagUrl } from '../../utils/country-flags';
import { SectionHeaderComponent } from '../section-header/section-header.component';

export interface HomeFeatureCard {
  title: string;
  tag: string;
  description: string;
  route: string;
  icon: string;
  image: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, SectionHeaderComponent],
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
  latestNews: F1NewsArticle[] = [];
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly featureCards: HomeFeatureCard[] = [
    {
      title: 'Gran Premi',
      tag: 'Calendario & Sessioni',
      description: 'Calendario stagionale, risultati di ogni sessione, strategie gomme, stint e pit-stop dal 1950 a oggi.',
      route: '/granpremi',
      icon: 'pi pi-flag-fill',
      image: 'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1000'
    },
    {
      title: 'Circuiti',
      tag: 'Tracciati Mondiali',
      description: 'Mappe dettagliate, lunghezza, numero di curve, record ufficiali sul giro e storia di ogni autodromo.',
      route: '/circuits',
      icon: 'pi pi-compass',
      image: 'https://media.istockphoto.com/id/810900482/photo/empty-racing-track-with-sunlight.jpg?s=612x612&w=0&k=20&c=8ndE0gqBB_-zyzYLVtx-oOWRcR4a4HaInGs8IVhC0GA='
    },
    {
      title: 'Piloti & Confronto H2H',
      tag: 'Protagonisti & Sfide',
      description: 'Schede carriera dei piloti attuali e storici più il comparatore Testa a Testa su titoli, vittorie e pole.',
      route: '/drivers',
      icon: 'pi pi-users',
      image: 'https://img.freepik.com/foto-premium/ritratto-del-pilota-di-f1-che-indossa-il-casco-pilota-di-formula-uno-in-piedi-sulla-pista-dopo-la-competizione_46383-9870.jpg'
    },
    {
      title: 'Scuderie',
      tag: 'Costruttori dal 1958',
      description: 'Tutti i team ufficiali con colori, loghi, sedi, Power Unit, line-up piloti e Palmarès Mondiale Costruttori.',
      route: '/scuderie',
      icon: 'pi pi-building',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Carlos_Sainz_Chinese_GP_2024.jpg/1280px-Carlos_Sainz_Chinese_GP_2024.jpg'
    },
    {
      title: 'Classifiche & Albo d\'Oro',
      tag: 'Campionato & Storia',
      description: 'Classifiche piloti e costruttori di ogni stagione e Albo d\'Oro completo di tutti i Campioni del Mondo.',
      route: '/classifiche',
      icon: 'pi pi-trophy',
      image: 'assets/classifiche.jpg'
    },
    {
      title: 'News dal Paddock',
      tag: 'Feed RSS in Tempo Reale',
      description: 'Ultime notizie, aggiornamenti tecnici e approfondimenti in tempo reale dalle principali testate italiane.',
      route: '/news',
      icon: 'pi pi-megaphone',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Max_Verstappen_2024_Chinese_GP.jpg/1280px-Max_Verstappen_2024_Chinese_GP.jpg'
    }
  ];

  private readonly openF1 = inject(Openf1ServiceService);
  private readonly newsService = inject(NewsService);

  async ngOnInit() {
    await Promise.all([
      this.loadSeasonStats(),
      this.loadLatestNews()
    ]);
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
    video.play()?.catch(() => {});
  }

  private async loadLatestNews(): Promise<void> {
    try {
      const all = await this.newsService.getLatestNews();
      this.latestNews = all.slice(0, 3);
    } catch {
      this.latestNews = [];
    }
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

  get canViewNextMeetingDetails(): boolean {
    if (!this.nextMeeting) return false;
    return new Date(this.nextMeeting.date_start).getTime() <= Date.now();
  }

  getFlag(countryCode?: string): string {
    return smallFlagUrl(countryCode);
  }
}
