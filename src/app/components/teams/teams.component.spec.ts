import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TeamsComponent } from './teams.component';
import { JolpicaService, ConstructorStanding, DriverStanding } from '../../services/jolpica.service';
import { TeamsStateService } from '../../services/teams-state.service';

describe('TeamsComponent', () => {
  const mockConstructors: ConstructorStanding[] = [
    { position: 1, points: 666, wins: 6, constructorId: 'mclaren', name: 'McLaren', nationality: 'British' },
    { position: 2, points: 652, wins: 5, constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian' },
    { position: 3, points: 589, wins: 9, constructorId: 'red_bull', name: 'Red Bull', nationality: 'Austrian' },
    { position: 8, points: 58, wins: 0, constructorId: 'haas', name: 'Haas F1 Team', nationality: 'American' }
  ];

  const mockDrivers: DriverStanding[] = [
    { position: 1, points: 437, wins: 9, driverId: 'max_verstappen', fullName: 'Max Verstappen', nationality: 'Dutch', constructorId: 'red_bull', constructorName: 'Red Bull', constructors: [{ id: 'red_bull', name: 'Red Bull' }] },
    { position: 2, points: 374, wins: 4, driverId: 'norris', fullName: 'Lando Norris', nationality: 'British', constructorId: 'mclaren', constructorName: 'McLaren', constructors: [{ id: 'mclaren', name: 'McLaren' }] },
    { position: 3, points: 356, wins: 3, driverId: 'leclerc', fullName: 'Charles Leclerc', nationality: 'Monegasque', constructorId: 'ferrari', constructorName: 'Ferrari', constructors: [{ id: 'ferrari', name: 'Ferrari' }] }
  ];

  let jolpicaMock: {
    getSeasons: ReturnType<typeof vi.fn>;
    getConstructorStandings: ReturnType<typeof vi.fn>;
    getDriverStandings: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    jolpicaMock = {
      getSeasons: vi.fn().mockResolvedValue([2025, 2024, 2023, 1988, 1958]),
      getConstructorStandings: vi.fn().mockResolvedValue(mockConstructors),
      getDriverStandings: vi.fn().mockResolvedValue(mockDrivers)
    };

    await TestBed.configureTestingModule({
      imports: [TeamsComponent],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpicaMock }
      ]
    }).compileComponents();
  });

  it('should load constructor standings, enrich with world titles, metadata and drivers', async () => {
    const fixture = TestBed.createComponent(TeamsComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.filteredTeams.length).toBe(4);

    const ferrari = component.filteredTeams.find(t => t.constructorId === 'ferrari')!;
    expect(ferrari.worldTitles).toBe(16);
    expect(ferrari.base).toContain('Maranello');
    expect(ferrari.drivers.map(d => d.fullName)).toContain('Charles Leclerc');
  });

  it('should filter by onlyChampions and sort by world titles', async () => {
    const fixture = TestBed.createComponent(TeamsComponent);
    const component = fixture.componentInstance;
    const state = TestBed.inject(TeamsStateService);
    await component.ngOnInit();

    component.toggleOnlyChampions();
    expect(state.onlyChampions).toBe(true);
    expect(component.filteredTeams.some(t => t.constructorId === 'haas')).toBe(false);

    component.sortBy = 'titles';
    component.onFilterChange();
    expect(component.filteredTeams[0].constructorId).toBe('ferrari');
  });
});
