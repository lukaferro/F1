import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { Circuit } from '../../models/circuit';
import { CircuitsService } from '../../services/circuits.service';
import { GranPremiStateService } from '../../services/gran-premi-state.service';
import { Openf1ServiceService } from '../../services/openf1-service';
import { JolpicaService } from '../../services/jolpica.service';
import { smallFlagUrl } from '../../utils/country-flags';
import {
  geoToSvg,
  getCircuitDisplayCoords,
  generateFlightPath,
  MACRO_REGIONS,
  CONTINENT_PATHS,
  GRID_LINES,
  MacroRegionId,
  MacroRegionInfo,
  GeoPoint,
  CircuitDisplayPoint
} from '../../utils/world-map-data';

export type CircuitSortOption =
  | 'default'
  | 'length-desc'
  | 'length-asc'
  | 'turns-desc'
  | 'turns-asc'
  | 'first-gp-asc'
  | 'first-gp-desc';

export type CircuitsViewMode = 'cards' | 'map' | 'calendar';

export interface RegionalLegGroup {
  region: MacroRegionInfo;
  circuits: Circuit[];
  totalLengthKm: number;
  avgTurns: number;
}

const normalizeText = (value: string) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-circuits',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TagModule, SelectModule],
  templateUrl: './circuits.component.html',
  styleUrl: './circuits.component.css'
})
export class CircuitsComponent implements OnInit {
  private readonly circuitsService = inject(CircuitsService);
  private readonly granPremiState = inject(GranPremiStateService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly openF1 = inject(Openf1ServiceService, { optional: true });
  private readonly jolpica = inject(JolpicaService, { optional: true });

  currentSeasonYear = new Date().getFullYear();

  circuits: Circuit[] = [];
  filteredCircuits: Circuit[] = [];
  expandedCircuits: Set<string> = new Set();

  // Dati vettoriali geografici realistici (Natural Earth)
  worldLandPath = '';
  worldBordersPath = '';

  // Modalità di visualizzazione
  viewMode: CircuitsViewMode = 'cards';

  // Toolbar filtri schede
  searchQuery = '';
  selectedContinent: string | null = null;
  selectedCountry: string | null = null;
  selectedSort: CircuitSortOption = 'default';

  continents: { name: string; value: string }[] = [];
  countries: { name: string; value: string }[] = [];

  readonly sortOptions: { name: string; value: CircuitSortOption }[] = [
    { name: 'Ordine predefinito', value: 'default' },
    { name: 'Lunghezza: dal più lungo', value: 'length-desc' },
    { name: 'Lunghezza: dal più corto', value: 'length-asc' },
    { name: 'Curve: dal maggior numero', value: 'turns-desc' },
    { name: 'Curve: dal minor numero', value: 'turns-asc' },
    { name: 'Primo GP: dal più storico', value: 'first-gp-asc' },
    { name: 'Primo GP: dal più recente', value: 'first-gp-desc' }
  ];

  // Vista Mappa Geografica
  readonly macroRegions = MACRO_REGIONS;
  readonly continentPaths = CONTINENT_PATHS;
  readonly gridLines = GRID_LINES;

  selectedMacroRegion: MacroRegionId = 'world';
  selectedCircuitOnMap: Circuit | null = null;
  hoveredCircuitOnMap: Circuit | null = null;
  mapViewBox = '0 0 1000 500';
  showFlightPath = true;
  flightPathD = '';

  // Vista Timeline / Calendario
  seasonCalendar: Circuit[] = [];
  regionalLegs: RegionalLegGroup[] = [];

  ngOnInit(): void {
    this.circuits = this.circuitsService.getCircuits();
    this.seasonCalendar = this.circuitsService.getSeasonCalendar();
    this.populateFilterOptions();
    this.applyFilters();
    this.initMapAndCalendar();
    this.loadWorldGeoData();
    void this.syncCurrentSeasonCalendar();
  }

  get totalSeasonKm(): number {
    const total = this.seasonCalendar.reduce((sum, c) => sum + (c.length_km || 0), 0);
    return Math.round(total * 10) / 10;
  }

  get totalSeasonTurns(): number {
    return this.seasonCalendar.reduce((sum, c) => sum + (c.turns || 0), 0);
  }

  getCircuitCountForRegion(regionId: string): number {
    return this.seasonCalendar.filter(c => c.macro_region === regionId).length;
  }

  private async syncCurrentSeasonCalendar(): Promise<void> {
    try {
      if (this.openF1) {
        const meetings = await this.openF1.getMeetings(this.currentSeasonYear);
        const gpMeetings = Array.isArray(meetings)
          ? meetings.filter(m => !m.meeting_name.toLowerCase().includes('testing'))
          : [];
        if (gpMeetings.length > 0) {
          this.circuitsService.applyMeetings(gpMeetings);
          this.refreshSeasonCalendar();
          return;
        }
      }

      if (this.jolpica) {
        const races = await this.jolpica.getSeasonRaces(this.currentSeasonYear);
        if (races && races.length > 0) {
          this.circuitsService.applySeasonRaces(races);
          this.refreshSeasonCalendar();
        }
      }
    } catch {
      // Mantiene trasparente il calendario base di default
    }
  }

  private refreshSeasonCalendar(): void {
    this.seasonCalendar = this.circuitsService.getSeasonCalendar();
    this.initMapAndCalendar();
  }

  private loadWorldGeoData(): void {
    if (!this.http) return;
    this.http.get<{ land: string; borders: string }>('/data/world-geo.json').subscribe({
      next: data => {
        if (data?.land) this.worldLandPath = data.land;
        if (data?.borders) this.worldBordersPath = data.borders;
      },
      error: () => {
        // Fallback silenzioso se l'asset non è raggiungibile (usa CONTINENT_PATHS)
      }
    });
  }

  private populateFilterOptions(): void {
    const continentSet = new Set<string>();
    const countrySet = new Set<string>();

    this.circuits.forEach(c => {
      if (c.continent) continentSet.add(c.continent);
      if (c.country) countrySet.add(c.country);
    });

    this.continents = Array.from(continentSet).sort().map(name => ({ name, value: name }));
    this.countries = Array.from(countrySet).sort().map(name => ({ name, value: name }));
  }

  private initMapAndCalendar(): void {
    // Genera la rotta di volo ufficiale tra i 24 GP
    this.flightPathD = generateFlightPath(this.seasonCalendar);

    // Raggruppa le tappe del campionato nelle 4 macro-fasi geografiche
    const regionOrder: MacroRegionId[] = ['europe', 'americas', 'middle_east', 'asia_pacific'];
    this.regionalLegs = regionOrder.map(regId => {
      const info = MACRO_REGIONS.find(m => m.id === regId)!;
      const circuits = this.seasonCalendar.filter(c => c.macro_region === regId);
      const totalKm = circuits.reduce((acc, c) => acc + (c.length_km || 0), 0);
      const avgTurns = circuits.length > 0
        ? Math.round((circuits.reduce((acc, c) => acc + (c.turns || 0), 0) / circuits.length) * 10) / 10
        : 0;

      return {
        region: info,
        circuits,
        totalLengthKm: Math.round(totalKm * 100) / 100,
        avgTurns
      };
    });
  }

  setViewMode(mode: CircuitsViewMode): void {
    this.viewMode = mode;
    if (mode === 'map' && !this.selectedCircuitOnMap && this.seasonCalendar.length > 0) {
      // Seleziona il primo circuito come default per mostrare l'ispettore
      this.selectedCircuitOnMap = this.seasonCalendar[0];
    }
  }

  get isGlobalView(): boolean {
    return this.selectedMacroRegion === 'world';
  }

  get sortedCalendarForMap(): Circuit[] {
    // Restituisce l'elenco stabile senza riordinare al passaggio del mouse
    // per evitare sfarfallii e scatti ("layout thrashing") nei pin SVG
    return this.seasonCalendar;
  }

  // --- Mappa Geografica Interattiva ---

  onSelectMacroRegion(regionId: MacroRegionId): void {
    this.selectedMacroRegion = regionId;
    const regionInfo = MACRO_REGIONS.find(r => r.id === regionId);
    if (regionInfo) {
      this.mapViewBox = regionInfo.viewBox;
    }
    this.flightPathD = generateFlightPath(this.seasonCalendar, this.isGlobalView);
  }

  getSvgCoords(circuit: Circuit): CircuitDisplayPoint {
    return getCircuitDisplayCoords(circuit, this.isGlobalView);
  }

  selectCircuitOnMap(circuit: Circuit): void {
    this.selectedCircuitOnMap = circuit;
  }

  closeMapInspector(): void {
    this.selectedCircuitOnMap = null;
  }

  toggleFlightPath(): void {
    this.showFlightPath = !this.showFlightPath;
  }

  focusCircuitOnMap(circuit: Circuit): void {
    this.viewMode = 'map';
    this.selectedCircuitOnMap = circuit;
    if (circuit.macro_region) {
      this.onSelectMacroRegion(circuit.macro_region);
    }
  }

  isCircuitHighlightedOnMap(circuit: Circuit): boolean {
    if (this.selectedCircuitOnMap?.id === circuit.id) return true;
    if (this.hoveredCircuitOnMap?.id === circuit.id) return true;
    if (this.selectedMacroRegion === 'world') return true;
    return circuit.macro_region === this.selectedMacroRegion;
  }

  getMacroRegionColor(regionId?: string): string {
    const reg = MACRO_REGIONS.find(r => r.id === regionId);
    return reg ? reg.color : '#e10600';
  }

  getMacroRegionLabel(regionId?: string): string {
    const reg = MACRO_REGIONS.find(r => r.id === regionId);
    return reg ? reg.shortLabel : 'Mondiale';
  }

  // --- Filtri e Ricerca Schede ---

  onSearchChange(): void {
    this.applyFilters();
  }

  onContinentChange(continent: string | null): void {
    this.selectedContinent = continent;
    this.applyFilters();
  }

  onCountryChange(country: string | null): void {
    this.selectedCountry = country;
    this.applyFilters();
  }

  onSortChange(sort: CircuitSortOption): void {
    this.selectedSort = sort || 'default';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedContinent = null;
    this.selectedCountry = null;
    this.selectedSort = 'default';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.selectedContinent ||
      this.selectedCountry ||
      this.selectedSort !== 'default'
    );
  }

  applyFilters(): void {
    const q = normalizeText(this.searchQuery);

    let result = this.circuits.filter(c => {
      if (this.selectedContinent && c.continent !== this.selectedContinent) {
        return false;
      }
      if (this.selectedCountry && c.country !== this.selectedCountry) {
        return false;
      }
      if (q) {
        const haystack = normalizeText(`${c.name} ${c.location} ${c.country} ${c.continent ?? ''}`);
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });

    switch (this.selectedSort) {
      case 'length-desc':
        result = [...result].sort((a, b) => b.length_km - a.length_km);
        break;
      case 'length-asc':
        result = [...result].sort((a, b) => a.length_km - b.length_km);
        break;
      case 'turns-desc':
        result = [...result].sort((a, b) => b.turns - a.turns);
        break;
      case 'turns-asc':
        result = [...result].sort((a, b) => a.turns - b.turns);
        break;
      case 'first-gp-asc':
        result = [...result].sort((a, b) => a.first_grand_prix - b.first_grand_prix);
        break;
      case 'first-gp-desc':
        result = [...result].sort((a, b) => b.first_grand_prix - a.first_grand_prix);
        break;
      default:
        result = [...result];
        break;
    }

    this.filteredCircuits = result;
  }

  viewCircuitRaces(circuit: Circuit): void {
    this.granPremiState.selectedYear = null;
    this.granPremiState.selectedCountry = null;
    this.granPremiState.selectedCircuit = circuit.gp_circuit_filter || circuit.location;
    this.router.navigate(['/granpremi']);
  }

  getFlag(countryCode: string): string {
    return smallFlagUrl(countryCode);
  }

  toggleExpand(circuitId: string): void {
    if (this.expandedCircuits.has(circuitId)) {
      this.expandedCircuits.delete(circuitId);
    } else {
      this.expandedCircuits.add(circuitId);
    }
  }

  isExpanded(circuitId: string): boolean {
    return this.expandedCircuits.has(circuitId);
  }
}
