import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { Meeting } from '../../models/meeting';
import { Openf1ServiceService } from '../../services/openf1-service';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

interface FilterOption {
  name: string;
  code?: string;
  value?: number;
}

// Mappatura dei codici paese dell'API ai codici ISO 3166-1 alpha-2 per le bandiere
const countryCodeMapping: Record<string, string> = {
  'BRN': 'bh', // Bahrain
  'SAU': 'sa', // Saudi Arabia
  'KSA': 'sa', // Saudi Arabia (codice alternativo)
  'AUS': 'au', // Australia
  'JPN': 'jp', // Japan
  'CHN': 'cn', // China
  'USA': 'us', // United States
  'ITA': 'it', // Italy
  'MCO': 'mc', // Monaco
  'MON': 'mc', // Monaco (codice alternativo)
  'CAN': 'ca', // Canada
  'ESP': 'es', // Spain
  'AUT': 'at', // Austria
  'GBR': 'gb', // Great Britain
  'HUN': 'hu', // Hungary
  'BEL': 'be', // Belgium
  'NLD': 'nl', // Netherlands
  'NED': 'nl', // Netherlands (codice alternativo)
  'AZE': 'az', // Azerbaijan
  'SGP': 'sg', // Singapore
  'MEX': 'mx', // Mexico
  'BRA': 'br', // Brazil
  'ARE': 'ae', // United Arab Emirates (Abu Dhabi)
  'UAE': 'ae', // United Arab Emirates (codice alternativo)
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

@Component({
  selector: 'app-gran-premi',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, RouterLink, ButtonModule, ApiUnavailableComponent],
  templateUrl: './gran-premi.component.html',
  styleUrls: ['./gran-premi.component.css']
})
export class GranPremiComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);

  years: FilterOption[] = [];
  countries: FilterOption[] = [];
  circuits: FilterOption[] = [];

  selectedYear: number | null = null;
  selectedCountry: string | null = null;
  selectedCircuit: string | null = null;

  meetings: Meeting[] = [];
  allMeetings: Meeting[] = []; // Mantiene tutti i meeting per il filtraggio
  loading = false;
  error?: string;


  async ngOnInit() {
    this.loadYears();
    await this.loadMeetings();
  }

  async onYearChange(payload: number | null) {
    this.selectedYear = typeof payload === 'number' ? payload : null;
    this.applyFilters();
  }

  async onCountryChange(payload: string | null) {
    this.selectedCountry = payload;
    this.applyFilters();
  }

  async onCircuitChange(payload: string | null) {
    this.selectedCircuit = payload;
    this.applyFilters();
  }

  async resetFilters() {
    this.selectedYear = null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    this.meetings = [...this.allMeetings];
  }
  
  resetSingleFilter(filterType: 'year' | 'country' | 'circuit') {
    switch (filterType) {
      case 'year':
        this.selectedYear = null;
        break;
      case 'country':
        this.selectedCountry = null;
        break;
      case 'circuit':
        this.selectedCircuit = null;
        break;
    }
    this.applyFilters();
  }

  private applyFilters() {
    let filteredMeetings = [...this.allMeetings];
    
    if (this.selectedYear) {
      filteredMeetings = filteredMeetings.filter(m => m.year === this.selectedYear);
    }
    
    if (this.selectedCountry) {
      filteredMeetings = filteredMeetings.filter(m => m.country_code === this.selectedCountry);
    }
    
    if (this.selectedCircuit) {
      filteredMeetings = filteredMeetings.filter(m => m.circuit_short_name === this.selectedCircuit);
    }
    
    this.meetings = filteredMeetings;
  }

  async loadMeetings() {
    this.loading = true;
    this.error = undefined;

    try {
      const resp = await this.openF1Service.getMeetings();
      let meetings: Meeting[] = [];

      if (Array.isArray(resp)) {
        meetings = resp;
      } else if (resp && Array.isArray((resp as any).data)) {
        meetings = (resp as any).data;
      }

      // Filtra solo i meeting che sono già iniziati o in corso
      const now = new Date();
      meetings = meetings.filter(m => {
        const startDate = new Date(m.date_start);
        return startDate <= now;
      });

      // Ordina per data (più recenti prima)
      meetings.sort((a, b) => {
        const dateA = new Date(a.date_start).getTime();
        const dateB = new Date(b.date_start).getTime();
        return dateB - dateA;
      });

      this.allMeetings = meetings;
      this.meetings = [...meetings];
      
      // Popola i filtri
      this.populateFilters(meetings);
    } catch (err: any) {
      this.meetings = [];
      this.allMeetings = [];
      this.error = err?.message || 'Errore caricamento meeting';
    } finally {
      this.loading = false;
    }
  }

  private populateFilters(meetings: Meeting[]) {
    // Popola i paesi
    const countries = new Map<string, string>();
    meetings.forEach(m => {
      if (m.country_code && m.country_name) {
        countries.set(m.country_code, m.country_name);
      }
    });
    
    this.countries = Array.from(countries).map(([code, name]) => ({
      name,
      code
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Popola i circuiti
    const circuits = new Map<string, string>();
    meetings.forEach(m => {
      if (m.circuit_short_name) {
        circuits.set(m.circuit_short_name, m.circuit_short_name);
      }
    });
    
    this.circuits = Array.from(circuits).map(([code, name]) => ({
      name,
      code
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  trackById(_: number, item: Meeting) {
    return item?.meeting_key ?? item?.id ?? _;
  }

  loadYears(startYear = 2023) {
    const currentYear = new Date().getFullYear();
    this.years = [];
    let y = currentYear;
    while (y >= startYear) {
      this.years.push({
        name: String(y),
        value: y
      });
      y--;
    }
  }
  
  // Converte i codici paese dell'API in codici ISO 3166-1 alpha-2 per le bandiere
  getCountryFlagCode(apiCountryCode: string): string {
    return countryCodeMapping[apiCountryCode] || apiCountryCode.toLowerCase();
  }
}