import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Openf1ServiceService, Driver } from './services/openf1-service';
import { Meeting } from './models/meeting';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule],
  template: `
    <div class="home-container">
      <section class="hero">
        <div class="hero-video">
          <video #heroVideo autoplay loop muted playsinline preload="auto" [muted]="true">
            <source src="assets/F1.mp4" type="video/mp4">
            Il tuo browser non supporta i video HTML5.
          </video>
          <div class="overlay"></div>
        </div>
        <div class="hero-content">
          <h1>Benvenuto nel mondo della <span class="f1-text">Formula 1</span></h1>
          <p>Scopri tutti i Gran Premi, i circuiti e le informazioni sulla stagione di Formula 1</p>
          <div class="hero-buttons">
            <p-button label="Esplora Gran Premi" icon="pi pi-flag-fill" routerLink="/granpremi" styleClass="p-button-raised"></p-button>
          </div>
        </div>
      </section>

      <section class="features">
        <h2>Scopri la Formula 1</h2>
        <div class="feature-cards">
          <p-card header="Gran Premi" subheader="Calendario completo" [style]="{ width: '360px' }">
            <ng-template pTemplate="header">
              <img alt="Gran Premi" src="https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200" [style]="{ width: '300px'}" loading="lazy" decoding="async" />
            </ng-template>
            <p>Esplora tutti i Gran Premi della stagione, con date, circuiti e informazioni dettagliate.</p>
            <ng-template pTemplate="footer">
              <p-button label="Visualizza" icon="pi pi-external-link" routerLink="/granpremi"></p-button>
            </ng-template>
          </p-card>

          <p-card header="Circuiti" subheader="Tracciati iconici" [style]="{ width: '360px' }">
            <ng-template pTemplate="header">
              <img alt="Circuiti" src="https://media.istockphoto.com/id/810900482/photo/empty-racing-track-with-sunlight.jpg?s=612x612&w=0&k=20&c=8ndE0gqBB_-zyzYLVtx-oOWRcR4a4HaInGs8IVhC0GA=" [style]="{ width: '300px'}" loading="lazy" decoding="async" />
            </ng-template>
            <p>Scopri i circuiti più iconici del mondo dove si svolgono le gare di Formula 1.</p>
            <ng-template pTemplate="footer">
              <p-button label="Visualizza" icon="pi pi-external-link" routerLink="/circuits"></p-button>
            </ng-template>
          </p-card>

          <p-card header="Piloti" subheader="I protagonisti" [style]="{ width: '360px' }">
            <ng-template pTemplate="header">
              <img alt="Piloti" src="https://img.freepik.com/foto-premium/ritratto-del-pilota-di-f1-che-indossa-il-casco-pilota-di-formula-uno-in-piedi-sulla-pista-dopo-la-competizione_46383-9870.jpg" [style]="{ width: '300px'}" loading="lazy" decoding="async" />
            </ng-template>
            <p>Tutti i piloti che partecipano al campionato mondiale di Formula 1.</p>
            <ng-template pTemplate="footer">
              <p-button label="Visualizza" icon="pi pi-external-link" routerLink="/drivers"></p-button>
            </ng-template>
          </p-card>
        </div>
      </section>

      <section class="stats-section">
        <h2>Statistiche F1</h2>
        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-flag-fill"></i>
            </div>
            <div class="stat-number">{{ grandPrixCount }}</div>
            <div class="stat-title">Gran Premi {{ seasonYear }}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-number">{{ driversCount }}</div>
            <div class="stat-title">Piloti {{ seasonYear }}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-building"></i>
            </div>
            <div class="stat-number">{{ teamsCount }}</div>
            <div class="stat-title">Team {{ seasonYear }}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-map"></i>
            </div>
            <div class="stat-number">{{ countriesCount }}</div>
            <div class="stat-title">Paesi ospitanti</div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .hero {
      position: relative;
      height: 500px;
      margin-bottom: 4rem;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }

    .hero-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .hero-video video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%);
      z-index: 2;
    }

    .hero::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #ff0000, #ff0000);
      z-index: 4;
    }

    .hero-content {
      position: relative;
      z-index: 3;
      padding: 4rem;
      color: #ffffff;
      max-width: 600px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      line-height: 1.2;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    .f1-text {
      color: #ff0000;
      font-weight: bold;
    }

    .hero p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
    }

    .features {
      margin-bottom: 4rem;
    }

    .features h2, .stats-section h2 {
      text-align: center;
      margin-bottom: 2rem;
      font-size: 2rem;
      position: relative;
      padding-bottom: 0.5rem;
    }

    .features h2::after, .stats-section h2::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 4px;
      background: #ff0000;
      border-radius: 2px;
    }

    .feature-cards {
      display: flex;
      gap: 2rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .stats-section {
      margin-bottom: 4rem;
      padding: 3rem 0;
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 12px;
      color: white;
    }

    .stats-container {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 2rem;
      padding: 0 2rem;
    }

    .stat-card {
      text-align: center;
      padding: 1.5rem;
      min-width: 200px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #ff0000;
    }

    .stat-number {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .stat-title {
      font-size: 1.2rem;
      color: #cccccc;
    }

    @media (max-width: 768px) {
      .hero {
        height: 400px;
      }

      .hero-content {
        padding: 2rem;
      }

      h1 {
        font-size: 2rem;
      }

      .stats-container {
        flex-direction: column;
        align-items: center;
      }

      .stat-card {
        width: 100%;
        max-width: 300px;
      }
    }
  `]
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