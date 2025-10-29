import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { Meeting } from '../../models/meeting';
import { Openf1ServiceService, Driver, Session, Result } from '../../services/openf1-service';

@Component({
  selector: 'app-gran-premi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TabViewModule, TableModule],
  templateUrl: './gran-premi-detail.component.html',
  styleUrl: './gran-premi-detail.component.css'
})
export class GranPremiDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly openF1Service = inject(Openf1ServiceService);
  
  meeting: Meeting | null = null;
  loading = true;
  error?: string;
  
  drivers: Driver[] = [];
  sessions: Session[] = [];
  raceResults: Result[] = [];
  qualifyingResults: Result[] = [];
  sprintResults: Result[] = [];
  
  loadingSessions = false;
  loadingResults = false;
  sessionsError?: string;
  resultsError?: string;
  
  activeSessionIndex = 0;
  
  // Immagini dei circuiti
  circuitImages: Record<string, string> = {
    'Monza': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit.png.transform/7col/image.png',
    'Spa-Francorchamps': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Belgium_Circuit.png.transform/7col/image.png',
    'Monte Carlo': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png.transform/7col/image.png',
    'Silverstone': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Great_Britain_Circuit.png.transform/7col/image.png',
    'Hungaroring': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Hungary_Circuit.png.transform/7col/image.png',
    'Imola': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Emilia_Romagna_Circuit.png.transform/7col/image.png',
    'Jeddah': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit.png.transform/7col/image.png',
    'Sakhir': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.png.transform/7col/image.png',
    'Melbourne': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit.png.transform/7col/image.png',
    'Suzuka': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png.transform/7col/image.png',
    'Interlagos': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Brazil_Circuit.png.transform/7col/image.png',
    'Yas Marina Circuit': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit.png.transform/7col/image.png',
    'Catalunya': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit.png.transform/7col/image.png',
    'Zandvoort': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Netherlands_Circuit.png.transform/7col/image.png',
    'Baku': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Baku_Circuit.png.transform/7col/image.png',
    'Singapore': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Singapore_Circuit.png.transform/7col/image.png',
    'Mexico City': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Mexico_Circuit.png.transform/7col/image.png',
    'Montreal': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Canada_Circuit.png.transform/7col/image.png',
    'Shanghai': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/China_Circuit.png.transform/7col/image.png',
    'Miami': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit.png.transform/7col/image.png',
    'Las Vegas': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Las_Vegas_Circuit.png.transform/7col/image.png',
    'Lusail': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Qatar_Circuit.png.transform/7col/image.png',
    'Spielberg': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Austria_Circuit.png.transform/7col/image.png',
    'Paul Ricard': 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/France_Circuit.png.transform/7col/image.png',
    'Austin': 'https://media.formula1.com/image/upload/c_lfill,w_3392/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/USA_Circuit.webp'
  };
  

  // Mappatura dei codici paese dell'API ai codici ISO 3166-1 alpha-2 per le bandiere
  countryCodeMapping: Record<string, string> = {
    'BRN': 'bh', // Bahrain
    'KSA': 'sa', // Saudi Arabia
    'AUS': 'au', // Australia
    'JPN': 'jp', // Japan
    'CHN': 'cn', // China
    'USA': 'us', // United States
    'ITA': 'it', // Italy
    'MON': 'mc', // Monaco
    'CAN': 'ca', // Canada
    'ESP': 'es', // Spain
    'AUT': 'at', // Austria
    'GBR': 'gb', // Great Britain
    'HUN': 'hu', // Hungary
    'BEL': 'be', // Belgium
    'NED': 'nl', // Netherlands
    'AZE': 'az', // Azerbaijan
    'SGP': 'sg', // Singapore
    'MEX': 'mx', // Mexico
    'BRA': 'br', // Brazil
    'UAE': 'ae', // United Arab Emirates (Abu Dhabi)
    'QAT': 'qa', // Qatar
    'FRA': 'fr', // France
    'DEU': 'de', // Germany
    'GER': 'de', // Germany (codice alternativo)
    'RUS': 'ru', // Russia
    'PRT': 'pt', // Portugal
    'TUR': 'tr', // Turkey
    'MYS': 'my', // Malaysia
    'JOR': 'jo', // Jordan
    'KOR': 'kr', // South Korea
    'IND': 'in', // India
    'ZAF': 'za', // South Africa
    'ABU': 'ae', // Abu Dhabi (codice alternativo)
    'ARG': 'ar', // Argentina
    'BAH': 'bh', // Bahrain (codice alternativo)
    'SIN': 'sg', // Singapore (codice alternativo)
    'JAP': 'jp', // Japan (codice alternativo)
    'MAL': 'my', // Malaysia (codice alternativo)
    'EUR': 'eu', // Europa
    'STY': 'at', // Styria (Austria)
    'EMI': 'it', // Emilia Romagna (Italia)
    'TUS': 'it', // Toscana (Italia)
    'POR': 'pt', // Portogallo (codice alternativo)
    'LUX': 'lu', // Lussemburgo
    'MIA': 'us', // Miami (USA)
    'LAS': 'us', // Las Vegas (USA)
    'TEX': 'us', // Texas (USA)
    'CAT': 'es', // Catalogna (Spagna)
    'SPA': 'be', // Spa (Belgio)
    'EIF': 'de', // Eifel (Germania)
    'MUG': 'it', // Mugello (Italia)
    'AZB': 'az'  // Azerbaijan (codice alternativo)
  };
  
  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadMeeting(Number(id));
      }
    });
  }
  
  getCircuitImage(circuitName: string): string {
    return this.circuitImages[circuitName];
  }
  
  // Converte i codici paese dell'API in codici ISO 3166-1 alpha-2 per le bandiere
  getCountryFlagCode(apiCountryCode: string): string {
    return this.countryCodeMapping[apiCountryCode] || apiCountryCode.toLowerCase();
  }
  
  // Formatta il fuso orario in formato italiano (24 ore)
  formatTimeOffset(offset: string): string {
    if (!offset) return 'UTC+0';
    
    // Rimuove i secondi e mantiene solo ore e minuti
    const timeRegex = /^([+-]?)(\d{2}):(\d{2}):(\d{2})$/;
    const match = offset.match(timeRegex);
    
    if (match) {
      const sign = match[1] || '+';
      const hours = match[2];
      const minutes = match[3];
      
      if (minutes === '00') {
        return `UTC${sign}${hours}`;
      } else {
        return `UTC${sign}${hours}:${minutes}`;
      }
    }
    
    return `UTC ${offset}`;
  }
  
  // Formatta il tempo in formato leggibile
  formatTime(timeMillis?: number): string {
    if (!timeMillis) return '-';
    
    const totalSeconds = Math.floor(timeMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = timeMillis % 1000;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  // Ottiene il nome della sessione in italiano
  getSessionName(session: Session): string {
    const typeMap: Record<string, string> = {
      'Race': 'Gara',
      'Qualifying': 'Qualifiche',
      'Sprint': 'Sprint',
      'Practice 1': 'Prove Libere 1',
      'Practice 2': 'Prove Libere 2',
      'Practice 3': 'Prove Libere 3',
      'Sprint Qualifying': 'Qualifiche Sprint'
    };
    
    return typeMap[session.session_type] || session.session_name;
  }
  
  // Formatta la data della sessione
  formatSessionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Ottiene il colore del team
  getTeamColor(color: string): string {
    return `#${color}`;
  }
  
  private loadMeeting(id: number) {
    this.loading = true;
    this.error = undefined;
    
    try {
      this.openF1Service.getMeetings().then(meetings => {
        console.log('Meetings loaded:', meetings);
        
        if (Array.isArray(meetings)) {
          this.meeting = meetings.find(m => m.meeting_key === id) || null;
        } else if (meetings && Array.isArray((meetings as any).data)) {
          this.meeting = (meetings as any).data.find((m: Meeting) => m.meeting_key === id) || null;
        }
        
        if (!this.meeting) {
          console.error('Meeting not found with ID:', id);
          this.error = 'Gran Premio non trovato';
          this.loading = false;
        } else {
          console.log('Meeting found:', this.meeting);
          this.loading = false;
          
          // Carica i piloti
          this.loadDrivers(id);
          
          // Carica le sessioni
          this.loadSessions(id);
        }
      }).catch(err => {
        console.error('Error loading meetings:', err);
        this.error = err?.message || 'Errore caricamento dettagli Gran Premio';
        this.loading = false;
      });
    } catch (err: any) {
      console.error('Errore loadMeeting', err);
      this.error = err?.message || 'Errore caricamento dettagli Gran Premio';
      this.loading = false;
    }
  }
  
  private loadDrivers(meetingKey: number) {
    this.openF1Service.getDrivers(meetingKey).then(drivers => {
      this.drivers = drivers;
      console.log('Drivers loaded:', drivers);
    }).catch(err => {
      console.error('Error loading drivers:', err);
    });
  }
  
  private loadSessions(meetingKey: number) {
    this.loadingSessions = true;
    this.sessionsError = undefined;
    
    this.openF1Service.getSessions(meetingKey).then(sessions => {
      this.sessions = sessions;
      console.log('Sessions loaded:', sessions);
      
      // Ordina le sessioni per data
      this.sessions.sort((a, b) => {
        return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
      });
      
      // Carica i risultati per ogni sessione
      this.loadResults();
      
      this.loadingSessions = false;
    }).catch(err => {
      console.error('Error loading sessions:', err);
      this.sessionsError = err?.message || 'Errore caricamento sessioni';
      this.loadingSessions = false;
    });
  }
  
  private loadResults() {
    this.loadingResults = true;
    this.resultsError = undefined;
    
    const promises: Promise<void>[] = [];
    
    // Trova la sessione di gara
    const raceSession = this.sessions.find(s => s.session_type === 'Race');
    if (raceSession) {
      const racePromise = this.openF1Service.getResults(raceSession.id).then(results => {
        if (Array.isArray(results) && results.length > 0) {
          this.raceResults = results.sort((a, b) => a.position - b.position);
          console.log('Race results loaded:', results);
        } else {
          console.warn('No race results found or empty array returned');
          this.raceResults = [];
        }
      }).catch(err => {
        console.error('Error loading race results:', err);
        this.raceResults = [];
      });
      
      promises.push(racePromise);
    } else {
      this.raceResults = [];
    }
    
    // Trova la sessione di qualifica
    const qualifyingSession = this.sessions.find(s => s.session_type === 'Qualifying');
    if (qualifyingSession) {
      const qualifyingPromise = this.openF1Service.getResults(qualifyingSession.id).then(results => {
        if (Array.isArray(results) && results.length > 0) {
          this.qualifyingResults = results.sort((a, b) => a.position - b.position);
          console.log('Qualifying results loaded:', results);
        } else {
          console.warn('No qualifying results found or empty array returned');
          this.qualifyingResults = [];
        }
      }).catch(err => {
        console.error('Error loading qualifying results:', err);
        this.qualifyingResults = [];
      });
      
      promises.push(qualifyingPromise);
    } else {
      this.qualifyingResults = [];
    }
    
    // Trova la sessione sprint
    const sprintSession = this.sessions.find(s => s.session_type === 'Sprint');
    if (sprintSession) {
      const sprintPromise = this.openF1Service.getResults(sprintSession.id).then(results => {
        if (Array.isArray(results) && results.length > 0) {
          this.sprintResults = results.sort((a, b) => a.position - b.position);
          console.log('Sprint results loaded:', results);
        } else {
          console.warn('No sprint results found or empty array returned');
          this.sprintResults = [];
        }
      }).catch(err => {
        console.error('Error loading sprint results:', err);
        this.sprintResults = [];
      });
      
      promises.push(sprintPromise);
    } else {
      this.sprintResults = [];
    }
    
    // Attendi che tutti i risultati siano caricati
    Promise.all(promises).then(() => {
      this.loadingResults = false;
      console.log('All results loaded. Race:', this.raceResults.length, 'Qualifying:', this.qualifyingResults.length, 'Sprint:', this.sprintResults.length);
    }).catch(err => {
      console.error('Error loading results:', err);
      this.resultsError = err?.message || 'Errore caricamento risultati';
      this.loadingResults = false;
    });
  }
}
