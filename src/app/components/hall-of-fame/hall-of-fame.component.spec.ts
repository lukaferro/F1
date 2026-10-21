import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HallOfFameComponent, HALL_OF_FAME_SEASONS } from './hall-of-fame.component';
import { StandingsStateService } from '../../services/standings-state.service';

describe('HallOfFameComponent', () => {
  let fixture: ComponentFixture<HallOfFameComponent>;
  let component: HallOfFameComponent;
  let stateService: StandingsStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HallOfFameComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    stateService = TestBed.inject(StandingsStateService);
    stateService.reset();

    fixture = TestBed.createComponent(HallOfFameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render all historical seasons from 1950 to 2025 by default', () => {
    expect(component.filteredSeasons.length).toBe(HALL_OF_FAME_SEASONS.length);
    expect(component.filteredSeasons[0].year).toBe(2025);
    expect(component.filteredSeasons[component.filteredSeasons.length - 1].year).toBe(1950);
  });

  it('should compute top multi-champion drivers and constructors accurately', () => {
    const schumacher = component.topDrivers.find(d => d.driverId === 'michael_schumacher');
    const hamilton = component.topDrivers.find(d => d.driverId === 'hamilton');
    const fangio = component.topDrivers.find(d => d.driverId === 'fangio');

    expect(schumacher?.titles).toBe(7);
    expect(hamilton?.titles).toBe(7);
    expect(fangio?.titles).toBe(5);

    const ferrari = component.topConstructors.find(c => c.constructorId === 'ferrari');
    const mclaren = component.topConstructors.find(c => c.constructorId === 'mclaren');
    const williams = component.topConstructors.find(c => c.constructorId === 'williams');

    expect(ferrari?.titles).toBe(16);
    expect(mclaren?.titles).toBe(10);
    expect(williams?.titles).toBe(9);
  });

  it('should filter seasons by decade and search term and reset properly', () => {
    component.setDecade('1950s');
    expect(component.filteredSeasons.length).toBe(10);
    expect(component.filteredSeasons.every(s => s.year >= 1950 && s.year <= 1959)).toBe(true);

    component.filterByQuery('Senna');
    expect(component.selectedDecade).toBe('all');
    expect(component.filteredSeasons.map(s => s.year)).toEqual([1991, 1990, 1988]);

    component.resetFilters();
    expect(component.hasActiveFilters).toBe(false);
    expect(component.filteredSeasons.length).toBe(HALL_OF_FAME_SEASONS.length);
  });

  it('should emit selectYear when opening a season standings', () => {
    let selectedYear: number | undefined;
    component.selectYear.subscribe(year => (selectedYear = year));

    component.openSeasonStandings(2004);
    expect(selectedYear).toBe(2004);
  });
});
