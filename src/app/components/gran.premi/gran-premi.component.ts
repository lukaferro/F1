import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Meeting } from '../../models/meeting';
import { Openf1ServiceService } from '../../services/openf1-service';
import { JolpicaService, HistoricRaceSummary } from '../../services/jolpica.service';
import { countryNameToCode, flagUrl } from '../../utils/country-flags';
import { constructorColor } from '../../utils/constructor-branding';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

interface FilterOption {
  name: string;
  code?: string;
  value?: number;
}

// Mappatura dei codici paese dell'API OpenF1 ai codici ISO 3166-1 alpha-2 per le bandiere
const countryCodeMapping: Record<string, string> = {
  'BRN': 'bh',
  'SAU': 'sa',
  'KSA': 'sa',
  'AUS': 'au',
  'JPN': 'jp',
  'CHN': 'cn',
  'USA': 'us',
  'ITA': 'it',
  'MCO': 'mc',
  'MON': 'mc',
  'CAN': 'ca',
  'ESP': 'es',
  'AUT': 'at',
  'GBR': 'gb',
  'HUN': 'hu',
  'BEL': 'be',
  'NLD': 'nl',
  'NED': 'nl',
  'AZE': 'az',
  'SGP': 'sg',
  'MEX': 'mx',
  'BRA': 'br',
  'ARE': 'ae',
  'UAE': 'ae',
  'QAT': 'qa',
  'FRA': 'fr',
  'DEU': 'de',
  'GER': 'de',
  'RUS': 'ru',
  'PRT': 'pt',
  'TUR': 'tr',
  'MYS': 'my',
  'JOR': 'jo',
  'KOR': 'kr',
  'IND': 'in',
  'ZAF': 'za',
  'ABU': 'ae',
  'ARG': 'ar',
  'BAH': 'bh',
  'SIN': 'sg',
  'JAP': 'jp',
  'MAL': 'my',
  'EUR': 'eu',
  'STY': 'at',
  'EMI': 'it',
  'TUS': 'it',
  'POR': 'pt',
  'LUX': 'lu',
  'MIA': 'us',
  'LAS': 'us',
  'TEX': 'us',
  'CAT': 'es',
  'SPA': 'be',
  'EIF': 'de',
  'MUG': 'it',
  'AZB': 'az'
};

@Component({
  selector: 'app-gran-premi',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, RouterLink, ButtonModule, ApiUnavailableComponent],
  templateUrl: './gran-premi.component.html',
  styleUrls: ['./gran-premi.component.css']
})
export class GranPremiComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);
  private readonly jolpica = inject(JolpicaService);

  years: FilterOption[] = [];
  countries: FilterOption[] = [];
  circuits: FilterOption[] = [];

  selectedYear: number | null = null;
  selectedCountry: string | null = null;
  selectedCircuit: string | null = null;

  meetings: Meeting[] = [];
  allMeetings: Meeting[] = []; // Mantiene tutti i meeting per il filtraggio
  historicRaces: HistoricRaceSummary[] | null = null;
  filteredHistoricRaces: HistoricRaceSummary[] = [];

  loading = true;
  error?: string;
  errorSource: 'openf1' | 'jolpica' = 'openf1';

  private requestSeq = 0;

  async ngOnInit() {
    this.loadYears();
    await this.loadMeetings();
  }

  async onYearChange(payload: number | null) {
    this.selectedYear = typeof payload === 'number' ? payload : null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    await this.applyYearAndFilters();
  }

  async onCountryChange(payload: string | null) {
    this.selectedCountry = payload;
    this.applyCurrentFilters();
  }

  async onCircuitChange(payload: string | null) {
    this.selectedCircuit = payload;
    this.applyCurrentFilters();
  }

  async resetFilters() {
    this.selectedYear = null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    this.historicRaces = null;
    this.filteredHistoricRaces = [];
    this.populateFilters(this.allMeetings);
    this.meetings = [...this.allMeetings];
  }

  resetSingleFilter(filterType: 'year' | 'country' | 'circuit') {
    switch (filterType) {
      case 'year':
        this.selectedYear = null;
        this.applyYearAndFilters();
        return;
      case 'country':
        this.selectedCountry = null;
        break;
      case 'circuit':
        this.selectedCircuit = null;
        break;
    }
    this.applyCurrentFilters();
  }

  private applyCurrentFilters() {
    if (this.selectedYear && this.selectedYear < 2023 && this.historicRaces) {
      this.filterHistoricRaces();
    } else {
      this.applyFilters();
    }
  }

  private async applyYearAndFilters() {
    if (!this.selectedYear || this.selectedYear >= 2023) {
      this.historicRaces = null;
      this.filteredHistoricRaces = [];
      this.populateFilters(this.allMeetings);
      this.applyFilters();
      return;
    }

    // Anno storico (< 2023): carichiamo il calendario da Jolpica
    const seq = ++this.requestSeq;
    this.loading = true;
    this.error = undefined;
    this.errorSource = 'jolpica';

    try {
      const races = await this.jolpica.getSeasonRaces(this.selectedYear);
      if (seq !== this.requestSeq) return;

      this.historicRaces = races;
      this.populateHistoricFilters(races);
      this.filterHistoricRaces();
    } catch (err: any) {
      if (seq !== this.requestSeq) return;
      this.historicRaces = null;
      this.filteredHistoricRaces = [];
      this.error = err?.message || 'Errore caricamento gare storiche';
      this.errorSource = 'jolpica';
    } finally {
      if (seq === this.requestSeq) {
        this.loading = false;
      }
    }
  }

  private filterHistoricRaces() {
    if (!this.historicRaces) return;
    let list = [...this.historicRaces];

    if (this.selectedCountry) {
      list = list.filter(r => r.country === this.selectedCountry);
    }

    if (this.selectedCircuit) {
      list = list.filter(r => r.circuitId === this.selectedCircuit);
    }

    this.filteredHistoricRaces = list;
  }

  private populateHistoricFilters(races: HistoricRaceSummary[]) {
    // Paesi delle gare storiche
    const countrySet = new Set<string>();
    races.forEach(r => {
      if (r.country) countrySet.add(r.country);
    });

    this.countries = Array.from(countrySet).map(country => ({
      name: country,
      code: country
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Circuiti delle gare storiche
    const circuitMap = new Map<string, string>();
    races.forEach(r => {
      if (r.circuitId && r.circuitName) {
        circuitMap.set(r.circuitId, r.circuitName);
      }
    });

    this.circuits = Array.from(circuitMap).map(([id, name]) => ({
      name,
      code: id
    })).sort((a, b) => a.name.localeCompare(b.name));
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
    this.errorSource = 'openf1';

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

      // Popola i filtri OpenF1
      this.populateFilters(meetings);
    } catch (err: any) {
      this.meetings = [];
      this.allMeetings = [];
      this.error = err?.message || 'Errore caricamento meeting';
      this.errorSource = 'openf1';
    } finally {
      this.loading = false;
    }
  }

  private populateFilters(meetings: Meeting[]) {
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

  async loadYears(startYear = 2023) {
    const currentYear = new Date().getFullYear();
    const openF1Years: number[] = [];
    let y = currentYear;
    while (y >= startYear) {
      openF1Years.push(y);
      y--;
    }

    try {
      const jolpicaSeasons = await this.jolpica.getSeasons();
      const allYears = Array.from(new Set([...openF1Years, ...jolpicaSeasons])).sort((a, b) => b - a);
      this.years = allYears.map(year => ({
        name: String(year),
        value: year
      }));
    } catch {
      // Fallback a OpenF1 se Jolpica non risponde
      this.years = openF1Years.map(year => ({
        name: String(year),
        value: year
      }));
    }
  }

  // Converte i codici paese dell'API OpenF1 in codici ISO 3166-1 alpha-2 per le bandiere
  getCountryFlagCode(apiCountryCode: string): string {
    return countryCodeMapping[apiCountryCode] || apiCountryCode.toLowerCase();
  }

  // Bandiera per le gare storiche da nome paese
  getCountryFlag(countryName: string): string {
    const code = countryNameToCode(countryName);
    return flagUrl(code);
  }

  getConstructorColor(constructorId: string): string {
    return constructorColor(constructorId);
  }
}