import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Meeting } from '../../models/meeting';
import { Openf1ServiceService } from '../../services/openf1-service';
import { JolpicaService, HistoricRaceSummary } from '../../services/jolpica.service';
import { GranPremiStateService } from '../../services/gran-premi-state.service';
import { countryNameToCode, smallFlagUrl } from '../../utils/country-flags';
import { constructorColor } from '../../utils/constructor-branding';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

export interface FilterOption {
  name: string;
  code?: string;
  value?: number;
}

export interface GpCard {
  id: string;
  season: number;
  locality: string;
  country: string;
  officialName: string;
  subName: string;
  date: string;
  circuit: string;
  flagUrl: string;
  link: (string | number)[];
  winner?: {
    fullName: string;
    constructorName: string;
    constructorId: string;
  };
}

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
  private readonly stateService = inject(GranPremiStateService);

  years: FilterOption[] = [];
  countries: FilterOption[] = [];
  circuits: FilterOption[] = [];

  selectedYear: number | null = null;
  selectedCountry: string | null = null;
  selectedCircuit: string | null = null;

  // Tutte le card caricate (per la stagione scelta o per Tutti gli anni)
  cards: GpCard[] = [];
  // Card dopo i filtri di paese e circuito
  filteredCards: GpCard[] = [];

  // Mantenimento meeting OpenF1 originali
  allMeetings: Meeting[] = [];
  // Per retrocompatibilità con i test
  meetings: Meeting[] = [];
  historicRaces: HistoricRaceSummary[] | null = null;
  filteredHistoricRaces: HistoricRaceSummary[] = [];

  loading = true;
  loadingMore = false;
  error?: string;
  errorSource: 'openf1' | 'jolpica' = 'openf1';

  oldestLoadedHistoricYear = 2023;
  canLoadMoreHistoric = true;

  private requestSeq = 0;

  async ngOnInit() {
    this.selectedYear = this.stateService.selectedYear;
    this.selectedCountry = this.stateService.selectedCountry;
    this.selectedCircuit = this.stateService.selectedCircuit;

    await this.loadYears();
    await this.loadInitialData();
  }

  private saveState() {
    this.stateService.selectedYear = this.selectedYear;
    this.stateService.selectedCountry = this.selectedCountry;
    this.stateService.selectedCircuit = this.selectedCircuit;
  }

  async onYearChange(payload: number | null) {
    this.selectedYear = typeof payload === 'number' ? payload : null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    this.saveState();
    await this.applyYearAndFilters();
  }

  onCountryChange(payload: string | null) {
    this.selectedCountry = payload;
    this.saveState();
    this.applyCurrentFilters();
  }

  onCircuitChange(payload: string | null) {
    this.selectedCircuit = payload;
    this.saveState();
    this.applyCurrentFilters();
  }

  async resetFilters() {
    this.selectedYear = null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    this.saveState();
    await this.applyYearAndFilters();
  }

  resetSingleFilter(filterType: 'year' | 'country' | 'circuit') {
    switch (filterType) {
      case 'year':
        this.selectedYear = null;
        this.saveState();
        this.applyYearAndFilters();
        return;
      case 'country':
        this.selectedCountry = null;
        break;
      case 'circuit':
        this.selectedCircuit = null;
        break;
    }
    this.saveState();
    this.applyCurrentFilters();
  }

  private meetingToCard(m: Meeting): GpCard {
    return {
      id: String(m.meeting_key),
      season: m.year,
      locality: m.location,
      country: m.country_name,
      officialName: m.meeting_official_name,
      subName: m.meeting_name,
      date: m.date_start,
      circuit: m.circuit_short_name || 'Circuit',
      flagUrl: smallFlagUrl(m.country_code),
      link: ['/granpremi', m.meeting_key]
    };
  }

  private historicToCard(r: HistoricRaceSummary): GpCard {
    return {
      id: `${r.season}-${r.round}`,
      season: r.season,
      locality: r.locality,
      country: r.country,
      officialName: r.raceName,
      subName: `Round ${r.round}`,
      date: r.date,
      circuit: r.circuitName,
      flagUrl: smallFlagUrl(countryNameToCode(r.country)),
      link: ['/granpremi', 'storico', r.season, r.round],
      winner: r.winner ? {
        fullName: r.winner.fullName,
        constructorName: r.winner.constructorName,
        constructorId: r.winner.constructorId
      } : undefined
    };
  }

  private applyCurrentFilters() {
    let list = [...this.cards];

    if (this.selectedCountry) {
      list = list.filter(c => c.country === this.selectedCountry);
    }

    if (this.selectedCircuit) {
      list = list.filter(c => c.circuit === this.selectedCircuit);
    }

    this.filteredCards = list;

    // Aggiorna anche per retrocompatibilità con i test
    if (this.historicRaces) {
      let hList = [...this.historicRaces];
      if (this.selectedCountry) hList = hList.filter(r => r.country === this.selectedCountry);
      if (this.selectedCircuit) hList = hList.filter(r => r.circuitName === this.selectedCircuit || r.circuitId === this.selectedCircuit);
      this.filteredHistoricRaces = hList;
    }

    let mList = [...this.allMeetings];
    if (this.selectedYear) mList = mList.filter(m => m.year === this.selectedYear);
    if (this.selectedCountry) mList = mList.filter(m => m.country_name === this.selectedCountry || m.country_code === this.selectedCountry);
    if (this.selectedCircuit) mList = mList.filter(m => m.circuit_short_name === this.selectedCircuit);
    this.meetings = mList;
  }

  async applyYearAndFilters() {
    const seq = ++this.requestSeq;
    this.error = undefined;

    if (!this.selectedYear) {
      // "Tutti gli anni": mostra le gare OpenF1 e le stagioni storiche caricate finora
      this.historicRaces = null;
      this.filteredHistoricRaces = [];
      const openF1Cards = this.allMeetings.map(m => this.meetingToCard(m));
      this.cards = openF1Cards;
      this.populateFiltersFromCards(this.cards);
      this.applyCurrentFilters();
      return;
    }

    if (this.selectedYear >= 2023) {
      // Anno moderno (2023+): usa OpenF1
      this.historicRaces = null;
      this.filteredHistoricRaces = [];
      const meetings = this.allMeetings.filter(m => m.year === this.selectedYear);
      this.cards = meetings.map(m => this.meetingToCard(m));
      this.populateFiltersFromCards(this.cards);
      this.applyCurrentFilters();
      return;
    }

    // Anno storico (< 2023): carica la stagione da Jolpica
    this.loading = true;
    this.errorSource = 'jolpica';

    try {
      const races = await this.jolpica.getSeasonRaces(this.selectedYear);
      if (seq !== this.requestSeq) return;

      this.historicRaces = races;
      this.cards = races.map(r => this.historicToCard(r));
      this.populateFiltersFromCards(this.cards);
      this.applyCurrentFilters();
    } catch (err: any) {
      if (seq !== this.requestSeq) return;
      this.historicRaces = null;
      this.filteredHistoricRaces = [];
      this.cards = [];
      this.filteredCards = [];
      this.error = err?.message || 'Errore caricamento gare storiche';
      this.errorSource = 'jolpica';
    } finally {
      if (seq === this.requestSeq) {
        this.loading = false;
      }
    }
  }

  /**
   * In modalità "Tutti gli anni", permette di caricare stagioni storiche precedenti
   * (ad es. 2022, 2021, 2020) e aggiungerle progressivamente in fondo all'elenco.
   */
  async loadMorePreviousSeasons() {
    if (this.loadingMore || !this.canLoadMoreHistoric) return;

    this.loadingMore = true;
    const startYear = this.oldestLoadedHistoricYear - 1;
    const yearsToLoad = [startYear, startYear - 1, startYear - 2].filter(y => y >= 1950);

    if (yearsToLoad.length === 0) {
      this.canLoadMoreHistoric = false;
      this.loadingMore = false;
      return;
    }

    try {
      for (const year of yearsToLoad) {
        const races = await this.jolpica.getSeasonRaces(year);
        const newCards = races.map(r => this.historicToCard(r));
        this.cards = [...this.cards, ...newCards];
        this.oldestLoadedHistoricYear = year;
      }
      this.populateFiltersFromCards(this.cards);
      this.applyCurrentFilters();
    } catch {
      // In caso di errore durante il caricamento progressivo, mantiene ciò che è caricato
    } finally {
      this.loadingMore = false;
      if (this.oldestLoadedHistoricYear <= 1950) {
        this.canLoadMoreHistoric = false;
      }
    }
  }

  private populateFiltersFromCards(cards: GpCard[]) {
    const countrySet = new Set<string>();
    const circuitSet = new Set<string>();

    cards.forEach(c => {
      if (c.country) countrySet.add(c.country);
      if (c.circuit) circuitSet.add(c.circuit);
    });

    this.countries = Array.from(countrySet).sort().map(name => ({
      name,
      code: name
    }));

    this.circuits = Array.from(circuitSet).sort().map(name => ({
      name,
      code: name
    }));
  }

  async loadInitialData() {
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

      const now = new Date();
      meetings = meetings.filter(m => new Date(m.date_start) <= now);
      meetings.sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());

      this.allMeetings = meetings;
      this.meetings = [...meetings];

      await this.applyYearAndFilters();
    } catch (err: any) {
      this.allMeetings = [];
      this.meetings = [];
      this.cards = [];
      this.filteredCards = [];
      this.error = err?.message || 'Errore caricamento Gran Premi';
      this.errorSource = 'openf1';
    } finally {
      this.loading = false;
    }
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
      this.years = openF1Years.map(year => ({
        name: String(year),
        value: year
      }));
    }
  }

  getConstructorColor(constructorId: string): string {
    return constructorColor(constructorId);
  }
}