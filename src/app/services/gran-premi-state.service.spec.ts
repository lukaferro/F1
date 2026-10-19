import { TestBed } from '@angular/core/testing';
import { GranPremiStateService } from './gran-premi-state.service';

describe('GranPremiStateService', () => {
  let service: GranPremiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GranPremiStateService);
  });

  it('should be created with initial null filter values', () => {
    expect(service).toBeTruthy();
    expect(service.selectedYear).toBeNull();
    expect(service.selectedCountry).toBeNull();
    expect(service.selectedCircuit).toBeNull();
    expect(service.loadedHistoricYears).toEqual([]);
  });

  it('should retain modified filter state', () => {
    service.selectedYear = 1988;
    service.selectedCountry = 'Italy';
    service.selectedCircuit = 'Monza';
    service.loadedHistoricYears = [2022, 2021];

    expect(service.selectedYear).toBe(1988);
    expect(service.selectedCountry).toBe('Italy');
    expect(service.selectedCircuit).toBe('Monza');
    expect(service.loadedHistoricYears).toEqual([2022, 2021]);
  });
});
