import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { HistoricGranPremiDetailComponent } from './historic-gran-premi-detail.component';
import { JolpicaService, HistoricRaceDetail, HistoricQualifyingResult } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';

const fakeRace = (extra: Partial<HistoricRaceDetail> = {}): HistoricRaceDetail => ({
  season: 1988,
  round: 1,
  raceName: 'Brazilian Grand Prix',
  circuitId: 'jacarepagua',
  circuitName: 'Autódromo Internacional Nelson Piquet',
  locality: 'Rio de Janeiro',
  country: 'Brazil',
  date: '1988-04-03',
  url: 'https://en.wikipedia.org/wiki/1988_Brazilian_Grand_Prix',
  wikiTitle: '1988_Brazilian_Grand_Prix',
  results: [
    {
      position: 1,
      positionText: '1',
      points: 9,
      driverId: 'prost',
      fullName: 'Alain Prost',
      nationality: 'French',
      wikiTitle: 'Alain_Prost',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      grid: 3,
      laps: 60,
      status: 'Finished',
      time: '1:36:06.857'
    },
    {
      position: 2,
      positionText: '2',
      points: 6,
      driverId: 'mansell',
      fullName: 'Nigel Mansell',
      nationality: 'British',
      wikiTitle: 'Nigel_Mansell',
      constructorId: 'williams',
      constructorName: 'Williams',
      grid: 2,
      laps: 60,
      status: 'Finished',
      time: '+9.873'
    },
    {
      position: 3,
      positionText: '3',
      points: 4,
      driverId: 'piquet',
      fullName: 'Nelson Piquet',
      nationality: 'Brazilian',
      wikiTitle: 'Nelson_Piquet',
      constructorId: 'lotus',
      constructorName: 'Lotus',
      grid: 4,
      laps: 60,
      status: 'Finished',
      time: '+14.233'
    },
    {
      position: 4,
      positionText: 'R',
      points: 0,
      driverId: 'senna',
      fullName: 'Ayrton Senna',
      nationality: 'Brazilian',
      wikiTitle: 'Ayrton_Senna',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      grid: 1,
      laps: 30,
      status: 'Disqualified'
    }
  ],
  ...extra
});

const fakeQualifying: HistoricQualifyingResult[] = [
  {
    position: 1,
    driverId: 'senna',
    code: 'SEN',
    fullName: 'Ayrton Senna',
    constructorId: 'mclaren',
    constructorName: 'McLaren',
    q1: '1:28.000',
    q2: '1:27.500',
    q3: '1:26.900'
  }
];

describe('HistoricGranPremiDetailComponent', () => {
  let fixture: ComponentFixture<HistoricGranPremiDetailComponent>;
  let component: HistoricGranPremiDetailComponent;
  let jolpicaMock: {
    getRaceResults: ReturnType<typeof vi.fn>;
    getRaceQualifying: ReturnType<typeof vi.fn>;
  };
  let wikiMock: {
    getImages: ReturnType<typeof vi.fn>;
  };

  const setup = async (raceData: HistoricRaceDetail | null = fakeRace(), qualiData: HistoricQualifyingResult[] = fakeQualifying) => {
    jolpicaMock = {
      getRaceResults: vi.fn().mockResolvedValue(raceData),
      getRaceQualifying: vi.fn().mockResolvedValue(qualiData)
    };
    wikiMock = {
      getImages: vi.fn().mockResolvedValue(new Map([['Alain_Prost', 'https://example.com/prost.jpg']]))
    };

    await TestBed.configureTestingModule({
      imports: [HistoricGranPremiDetailComponent],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpicaMock },
        { provide: WikipediaService, useValue: wikiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: {
              subscribe: (fn: (params: unknown) => void) => fn(convertToParamMap({ season: '1988', round: '1' }))
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricGranPremiDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('renders the historic race header and podium', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Brazilian Grand Prix');
    expect(el.textContent).toContain('Autódromo Internacional Nelson Piquet');
    expect(el.textContent).toContain('Rio de Janeiro');
    expect(el.textContent).toContain('Round 1');

    // Podio contiene i primi 3
    expect(el.textContent).toContain('Alain Prost');
    expect(el.textContent).toContain('Nigel Mansell');
    expect(el.textContent).toContain('Nelson Piquet');

    // Foto caricata per Prost
    const img = el.querySelector<HTMLImageElement>('.podium-visual img');
    expect(img?.src).toContain('https://example.com/prost.jpg');
  });

  it('links drivers to historic profile or current profile', async () => {
    await setup();
    expect(component.driverLink('senna')).toEqual(['/drivers', 'storico', 'senna']);
    expect(component.driverLink('hamilton', 'HAM')).toEqual(['/drivers', 'storico', 'hamilton']);

    // Se la gara è del 2023 o successiva con codice
    component.raceDetail = fakeRace({ season: 2024 });
    expect(component.driverLink('hamilton', 'HAM')).toEqual(['/drivers', 'HAM']);
  });

  it('shows full race classification table', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;

    const rows = el.querySelectorAll('.race-results-table tbody tr');
    expect(rows.length).toBe(4);
    expect(el.textContent).toContain('Disqualified');
  });

  it('shows qualifying table when data is available', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;

    const tabs = el.querySelectorAll('.tab-button');
    expect(tabs.length).toBe(2);

    component.selectedTab = 'qualifying';
    fixture.detectChanges();

    expect(el.textContent).toContain('1:26.900');
  });

  it('shows not found message for unknown race', async () => {
    await setup(null);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Gran Premio non trovato');
    expect(el.textContent).toContain('Torna ai Gran Premi');
  });

  it('shows Jolpica unavailable banner on API error', async () => {
    jolpicaMock = {
      getRaceResults: vi.fn().mockRejectedValue(new Error('Network error')),
      getRaceQualifying: vi.fn().mockResolvedValue([])
    };
    wikiMock = { getImages: vi.fn().mockResolvedValue(new Map()) };

    await TestBed.configureTestingModule({
      imports: [HistoricGranPremiDetailComponent],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpicaMock },
        { provide: WikipediaService, useValue: wikiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: {
              subscribe: (fn: (params: unknown) => void) => fn(convertToParamMap({ season: '1988', round: '1' }))
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricGranPremiDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-api-unavailable')).toBeTruthy();
  });

  it('routes to historic grand prix component', async () => {
    jolpicaMock = {
      getRaceResults: vi.fn().mockResolvedValue(fakeRace()),
      getRaceQualifying: vi.fn().mockResolvedValue([])
    };
    wikiMock = { getImages: vi.fn().mockResolvedValue(new Map()) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: JolpicaService, useValue: jolpicaMock },
        { provide: WikipediaService, useValue: wikiMock }
      ]
    });

    const harness = await RouterTestingHarness.create();
    const comp = await harness.navigateByUrl('/granpremi/storico/1988/1', HistoricGranPremiDetailComponent);
    expect(comp).toBeInstanceOf(HistoricGranPremiDetailComponent);
  });
});
