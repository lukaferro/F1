import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DriverComparisonComponent } from './driver-comparison.component';
import { JolpicaService, JolpicaDriverInfo, CareerTotals } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';

describe('DriverComparisonComponent', () => {
  const mockDrivers: JolpicaDriverInfo[] = [
    {
      driverId: 'max_verstappen',
      givenName: 'Max',
      familyName: 'Verstappen',
      fullName: 'Max Verstappen',
      nationality: 'Dutch',
      wikiTitle: 'Max_Verstappen'
    },
    {
      driverId: 'leclerc',
      givenName: 'Charles',
      familyName: 'Leclerc',
      fullName: 'Charles Leclerc',
      nationality: 'Monegasque',
      wikiTitle: 'Charles_Leclerc'
    },
    {
      driverId: 'senna',
      givenName: 'Ayrton',
      familyName: 'Senna',
      fullName: 'Ayrton Senna',
      nationality: 'Brazilian',
      wikiTitle: 'Ayrton_Senna'
    },
    {
      driverId: 'prost',
      givenName: 'Alain',
      familyName: 'Prost',
      fullName: 'Alain Prost',
      nationality: 'French',
      wikiTitle: 'Alain_Prost'
    }
  ];

  const totalsByDriver: Record<string, CareerTotals> = {
    max_verstappen: { races: 200, wins: 62, podiums: 111, poles: 40, fastestLaps: 33, debut: { season: 2015, raceName: 'Australian GP' } },
    leclerc: { races: 147, wins: 8, podiums: 43, poles: 26, fastestLaps: 10, debut: { season: 2018, raceName: 'Australian GP' } },
    senna: { races: 161, wins: 41, podiums: 80, poles: 65, fastestLaps: 19, debut: { season: 1984, raceName: 'Brazilian GP' } },
    prost: { races: 199, wins: 51, podiums: 106, poles: 33, fastestLaps: 41, debut: { season: 1980, raceName: 'Argentine GP' } }
  };

  let jolpicaMock: {
    getAllDrivers: ReturnType<typeof vi.fn>;
    getDriver: ReturnType<typeof vi.fn>;
    getCareerTotals: ReturnType<typeof vi.fn>;
  };
  let wikiMock: {
    getImages: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    jolpicaMock = {
      getAllDrivers: vi.fn().mockResolvedValue(mockDrivers),
      getDriver: vi.fn().mockImplementation(async (id: string) => mockDrivers.find(d => d.driverId === id) ?? null),
      getCareerTotals: vi.fn().mockImplementation(async (id: string) => totalsByDriver[id] ?? { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 })
    };
    wikiMock = {
      getImages: vi.fn().mockResolvedValue(new Map<string, string>())
    };

    await TestBed.configureTestingModule({
      imports: [DriverComparisonComponent],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpicaMock },
        { provide: WikipediaService, useValue: wikiMock }
      ]
    }).compileComponents();
  });

  it('should load initial head-to-head comparison and compute all 7 metrics', async () => {
    const fixture = TestBed.createComponent(DriverComparisonComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.leftDriver?.info.driverId).toBe('max_verstappen');
    expect(component.rightDriver?.info.driverId).toBe('leclerc');
    expect(component.metrics.length).toBe(7);

    const titlesMetric = component.metrics.find(m => m.key === 'championships')!;
    expect(titlesMetric.leftValue).toBe(4);
    expect(titlesMetric.rightValue).toBe(0);
    expect(titlesMetric.winner).toBe('left');

    const winRateMetric = component.metrics.find(m => m.key === 'winRate')!;
    expect(winRateMetric.leftDisplay).toBe('31.0%');
    expect(winRateMetric.winner).toBe('left');
  });

  it('should switch to a classic rivalry preset (Senna vs Prost) and highlight winners per stat', async () => {
    const fixture = TestBed.createComponent(DriverComparisonComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    const sennaProst = component.presets.find(p => p.leftId === 'senna')!;
    await component.selectPreset(sennaProst);
    fixture.detectChanges();

    expect(component.leftDriver?.info.driverId).toBe('senna');
    expect(component.rightDriver?.info.driverId).toBe('prost');

    const titlesMetric = component.metrics.find(m => m.key === 'championships')!;
    expect(titlesMetric.leftValue).toBe(3);
    expect(titlesMetric.rightValue).toBe(4);
    expect(titlesMetric.winner).toBe('right');

    const polesMetric = component.metrics.find(m => m.key === 'poles')!;
    expect(polesMetric.leftValue).toBe(65);
    expect(polesMetric.rightValue).toBe(33);
    expect(polesMetric.winner).toBe('left');
  });

  it('should swap left and right drivers when swapDrivers is called', async () => {
    const fixture = TestBed.createComponent(DriverComparisonComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    await component.swapDrivers();
    expect(component.leftDriverId).toBe('leclerc');
    expect(component.rightDriverId).toBe('max_verstappen');
  });
});
