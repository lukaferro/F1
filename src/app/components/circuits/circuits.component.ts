import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { Circuit } from '../../models/circuit';
import { CircuitsService } from '../../services/circuits.service';
import { GranPremiStateService } from '../../services/gran-premi-state.service';
import { smallFlagUrl } from '../../utils/country-flags';

export type CircuitSortOption =
  | 'default'
  | 'length-desc'
  | 'length-asc'
  | 'turns-desc'
  | 'turns-asc'
  | 'first-gp-asc'
  | 'first-gp-desc';

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

  circuits: Circuit[] = [];
  filteredCircuits: Circuit[] = [];
  expandedCircuits: Set<string> = new Set();

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

  ngOnInit(): void {
    this.circuits = this.circuitsService.getCircuits();
    this.populateFilterOptions();
    this.applyFilters();
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
