import { TestBed } from '@angular/core/testing';
import { DriversStateService } from './drivers-state.service';

describe('DriversStateService', () => {
  let service: DriversStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DriversStateService);
  });

  it('should be created with initial null year and empty search query', () => {
    expect(service).toBeTruthy();
    expect(service.selectedYear).toBeNull();
    expect(service.searchQuery).toBe('');
  });

  it('should retain modified filter state', () => {
    service.selectedYear = 1991;
    service.searchQuery = 'Senna';

    expect(service.selectedYear).toBe(1991);
    expect(service.searchQuery).toBe('Senna');
  });
});
