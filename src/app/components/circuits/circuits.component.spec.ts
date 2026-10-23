import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CircuitsComponent } from './circuits.component';
import { GranPremiStateService } from '../../services/gran-premi-state.service';

describe('CircuitsComponent', () => {
  let component: CircuitsComponent;
  let fixture: ComponentFixture<CircuitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitsComponent],
      // router e HTTP finti: i componenti li usano, ma nei test non devono chiamare l'API vera
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircuitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.filteredCircuits.length).toBeGreaterThan(0);
  });

  it('filters circuits by search query, continent and country', () => {
    component.searchQuery = 'monza';
    component.onSearchChange();
    expect(component.filteredCircuits.length).toBe(1);
    expect(component.filteredCircuits[0].id).toBe('monza');

    component.resetFilters();
    component.onContinentChange('Medio Oriente');
    expect(component.filteredCircuits.every(c => c.continent === 'Medio Oriente')).toBe(true);

    component.onCountryChange('Bahrain');
    expect(component.filteredCircuits.length).toBe(1);
    expect(component.filteredCircuits[0].id).toBe('bahrain');
  });

  it('sorts circuits by length, turns, and first grand prix year', () => {
    component.onSortChange('length-desc');
    expect(component.filteredCircuits[0].id).toBe('spa');

    component.onSortChange('length-asc');
    expect(component.filteredCircuits[0].id).toBe('monaco');

    component.onSortChange('turns-desc');
    expect(component.filteredCircuits[0].id).toBe('jeddah');

    component.onSortChange('first-gp-desc');
    expect(component.filteredCircuits[0].id).toBe('madrid');
  });

  it('navigates to /granpremi with circuit filter preselected when clicking Edizioni GP', () => {
    const state = TestBed.inject(GranPremiStateService);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const monza = component.circuits.find(c => c.id === 'monza')!;
    component.viewCircuitRaces(monza);

    expect(state.selectedYear).toBeNull();
    expect(state.selectedCountry).toBeNull();
    expect(state.selectedCircuit).toBe('Monza');
    expect(navSpy).toHaveBeenCalledWith(['/granpremi']);
  });

  it('switches between cards, map and calendar view modes', () => {
    expect(component.viewMode).toBe('cards');

    component.setViewMode('map');
    expect(component.viewMode).toBe('map');
    expect(component.selectedCircuitOnMap).toBeTruthy();

    component.setViewMode('calendar');
    expect(component.viewMode).toBe('calendar');
  });

  it('updates macro region and map viewBox when selecting a region', () => {
    component.onSelectMacroRegion('europe');
    expect(component.selectedMacroRegion).toBe('europe');
    expect(component.mapViewBox).toBe('470 85 110 70');

    component.onSelectMacroRegion('world');
    expect(component.selectedMacroRegion).toBe('world');
    expect(component.mapViewBox).toBe('0 0 1000 500');
  });

  it('focuses a specific circuit on the map and zooms to its macro region', () => {
    const interlagos = component.circuits.find(c => c.id === 'interlagos')!;
    component.focusCircuitOnMap(interlagos);

    expect(component.viewMode).toBe('map');
    expect(component.selectedCircuitOnMap?.id).toBe('interlagos');
    expect(component.selectedMacroRegion).toBe('americas');
    expect(component.mapViewBox).toBe('130 90 310 270');
  });

  it('computes 4 regional legs for the calendar with total km and average turns', () => {
    expect(component.regionalLegs.length).toBe(4);
    const europeLeg = component.regionalLegs.find(l => l.region.id === 'europe')!;
    expect(europeLeg).toBeTruthy();
    expect(europeLeg.circuits.length).toBe(9);
    expect(europeLeg.totalLengthKm).toBeGreaterThan(40);
    expect(europeLeg.avgTurns).toBeGreaterThan(10);
  });

  it('toggles flight path visibility and generates flight route d path', () => {
    expect(component.showFlightPath).toBe(true);
    expect(component.flightPathD).toContain('M');

    component.toggleFlightPath();
    expect(component.showFlightPath).toBe(false);

    component.toggleFlightPath();
    expect(component.showFlightPath).toBe(true);
  });
});
