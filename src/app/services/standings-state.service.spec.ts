import { TestBed } from '@angular/core/testing';
import { StandingsStateService } from './standings-state.service';

describe('StandingsStateService', () => {
  let service: StandingsStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StandingsStateService);
  });

  it('should be created with initial null season and drivers tab', () => {
    expect(service).toBeTruthy();
    expect(service.selectedSeason).toBeNull();
    expect(service.tab).toBe('drivers');
  });

  it('should retain modified season and tab', () => {
    service.selectedSeason = 1998;
    service.tab = 'constructors';

    expect(service.selectedSeason).toBe(1998);
    expect(service.tab).toBe('constructors');
  });
});
