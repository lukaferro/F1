import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GranPremiComponent } from './gran-premi.component';
import { Openf1ServiceService } from '../../services/openf1-service';
import { JolpicaService, HistoricRaceSummary } from '../../services/jolpica.service';
import { GranPremiStateService } from '../../services/gran-premi-state.service';
import { Meeting } from '../../models/meeting';

const fakeMeetings: Meeting[] = [
  {
    id: 1,
    meeting_key: 1219,
    meeting_code: 'ITA',
    meeting_name: 'Monza',
    meeting_official_name: 'Formula 1 Pirelli Gran Premio d\'Italia 2024',
    location: 'Monza',
    country_code: 'ITA',
    country_name: 'Italy',
    circuit_short_name: 'Monza',
    date_start: '2024-08-30T10:00:00',
    year: 2024,
    circuit_key: 10,
    gmt_offset: '+02:00'
  },
  {
    id: 2,
    meeting_key: 1220,
    meeting_code: 'GBR',
    meeting_name: 'Silverstone',
    meeting_official_name: 'Formula 1 British Grand Prix 2024',
    location: 'Silverstone',
    country_code: 'GBR',
    country_name: 'Great Britain',
    circuit_short_name: 'Silverstone',
    date_start: '2024-07-05T10:00:00',
    year: 2024,
    circuit_key: 9,
    gmt_offset: '+01:00'
  }
];


const fakeHistoricRaces: HistoricRaceSummary[] = [
  {
    season: 1988,
    round: 1,
    raceName: 'Brazilian Grand Prix',
    circuitId: 'jacarepagua',
    circuitName: 'Autódromo Internacional Nelson Piquet',
    locality: 'Rio de Janeiro',
    country: 'Brazil',
    date: '1988-04-03',
    winner: {
      driverId: 'prost',
      fullName: 'Alain Prost',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      time: '1:36:06.857'
    }
  },
  {
    season: 1988,
    round: 2,
    raceName: 'San Marino Grand Prix',
    circuitId: 'imola',
    circuitName: 'Autodromo Enzo e Dino Ferrari',
    locality: 'Imola',
    country: 'Italy',
    date: '1988-05-01',
    winner: {
      driverId: 'senna',
      fullName: 'Ayrton Senna',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      time: '1:32:41.264'
    }
  }
];

describe('GranPremiComponent', () => {
  let component: GranPremiComponent;
  let fixture: ComponentFixture<GranPremiComponent>;
  let stateService: GranPremiStateService;
  let openF1Mock: {
    getMeetings: ReturnType<typeof vi.fn>;
    apiStatus: ReturnType<typeof vi.fn>;
  };
  let jolpicaMock: {
    getSeasons: ReturnType<typeof vi.fn>;
    getSeasonRaces: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    openF1Mock = {
      getMeetings: vi.fn().mockResolvedValue(fakeMeetings),
      apiStatus: vi.fn().mockReturnValue('ok')
    };
    jolpicaMock = {
      getSeasons: vi.fn().mockResolvedValue([2026, 2025, 2024, 2023, 1988, 1950]),
      getSeasonRaces: vi.fn().mockImplementation((year: number) =>
        Promise.resolve(fakeHistoricRaces.map(r => ({ ...r, season: year })))
      )
    };

    await TestBed.configureTestingModule({
      imports: [GranPremiComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: Openf1ServiceService, useValue: openF1Mock },
        { provide: JolpicaService, useValue: jolpicaMock }
      ]
    }).compileComponents();

    stateService = TestBed.inject(GranPremiStateService);
    stateService.selectedYear = null;
    stateService.selectedCountry = null;
    stateService.selectedCircuit = null;

    fixture = TestBed.createComponent(GranPremiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('offers seasons from 1950 to current year in the year dropdown', () => {
    const values = component.years.map(y => y.value);
    expect(values).toContain(1950);
    expect(values).toContain(1988);
    expect(values).toContain(2024);
  });

  it('loads historic races with winner when year < 2023', async () => {
    await component.onYearChange(1988);
    fixture.detectChanges();

    expect(jolpicaMock.getSeasonRaces).toHaveBeenCalledWith(1988);
    expect(component.filteredHistoricRaces.length).toBe(2);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Brazilian Grand Prix');
    expect(el.textContent).toContain('Alain Prost');
    expect(el.textContent).toContain('McLaren');
    expect(el.textContent).toContain('San Marino Grand Prix');
    expect(el.textContent).toContain('Ayrton Senna');
  });

  it('filters historic races by country and circuit', async () => {
    await component.onYearChange(1988);
    fixture.detectChanges();

    expect(component.countries.some(c => c.name === 'Brazil')).toBe(true);
    expect(component.countries.some(c => c.name === 'Italy')).toBe(true);

    component.onCountryChange('Italy');
    fixture.detectChanges();

    expect(component.filteredHistoricRaces.length).toBe(1);
    expect(component.filteredHistoricRaces[0].raceName).toBe('San Marino Grand Prix');
  });

  it('ignores responses from stale year selections', async () => {
    let slowResolve!: (v: HistoricRaceSummary[]) => void;
    jolpicaMock.getSeasonRaces.mockImplementation((y: number) => {
      if (y === 1975) {
        return new Promise<HistoricRaceSummary[]>(ok => slowResolve = ok);
      }
      return Promise.resolve(fakeHistoricRaces);
    });

    component.onYearChange(1975);
    component.onYearChange(1988);
    await fixture.whenStable();

    slowResolve([{
      season: 1975,
      round: 1,
      raceName: 'Argentine Grand Prix',
      circuitId: 'ba',
      circuitName: 'Buenos Aires',
      locality: 'Buenos Aires',
      country: 'Argentina',
      date: '1975-01-12'
    }]);
    await fixture.whenStable();

    // Rimangono quelle del 1988
    expect(component.filteredHistoricRaces.length).toBe(2);
    expect(component.filteredHistoricRaces[0].season).toBe(1988);
  });

  it('keeps current OpenF1 behavior when year >= 2023', async () => {
    await component.onYearChange(2024);
    fixture.detectChanges();

    expect(component.historicRaces).toBeNull();
    expect(component.meetings.length).toBe(2);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Formula 1 Pirelli Gran Premio d\'Italia 2024');
  });

  it('shows Jolpica notice when historic season fails', async () => {
    jolpicaMock.getSeasonRaces.mockRejectedValueOnce(new Error('API error'));

    await component.onYearChange(1988);
    fixture.detectChanges();

    expect(component.error).toBeTruthy();
    expect(component.errorSource).toBe('jolpica');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-api-unavailable')).toBeTruthy();
  });

  it('persists selected filters to GranPremiStateService', async () => {
    await component.onYearChange(1988);
    component.onCountryChange('Italy');
    component.onCircuitChange('imola');

    expect(stateService.selectedYear).toBe(1988);
    expect(stateService.selectedCountry).toBe('Italy');
    expect(stateService.selectedCircuit).toBe('imola');
  });

  it('restores filters from GranPremiStateService on init', async () => {
    stateService.selectedYear = 2024;
    stateService.selectedCountry = 'Italy';

    const newFixture = TestBed.createComponent(GranPremiComponent);
    const newComp = newFixture.componentInstance;
    newFixture.detectChanges();
    await newFixture.whenStable();
    newFixture.detectChanges();

    expect(newComp.selectedYear).toBe(2024);
    expect(newComp.selectedCountry).toBe('Italy');
    expect(newComp.filteredCards.length).toBe(1);
    expect(newComp.filteredCards[0].locality).toBe('Monza');
  });

  it('unifies cards in filteredCards for OpenF1 and Jolpica with standard flags', async () => {
    // OpenF1
    await component.onYearChange(2024);
    fixture.detectChanges();
    expect(component.filteredCards.length).toBe(2);
    expect(component.filteredCards[0].flagUrl).toContain('flagcdn.com/24x18/it.png');

    // Jolpica
    await component.onYearChange(1988);
    fixture.detectChanges();
    expect(component.filteredCards.length).toBe(2);
    expect(component.filteredCards[0].flagUrl).toContain('flagcdn.com/24x18/br.png');
    expect(component.filteredCards[1].flagUrl).toContain('flagcdn.com/24x18/it.png');
  });

  it('loads previous seasons when loadMorePreviousSeasons is triggered in all-years mode', async () => {
    await component.onYearChange(null);
    fixture.detectChanges();

    expect(component.cards.length).toBe(2); // Only OpenF1 cards initially

    await component.loadMorePreviousSeasons();
    fixture.detectChanges();

    expect(jolpicaMock.getSeasonRaces).toHaveBeenCalled();
    expect(component.cards.length).toBeGreaterThan(2);
  });
});

