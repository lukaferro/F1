import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { DriversComponent, HistoricCard } from './drivers.component';
import { Driver, Openf1ServiceService, Session } from '../../services/openf1-service';
import { DriverStanding, JolpicaDriverInfo, JolpicaService } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { constructorColor } from '../../utils/constructor-branding';

const DRIVERS_2026: Driver[] = [
  {
    driver_number: 1,
    broadcast_name: 'M VERSTAPPEN',
    full_name: 'Max Verstappen',
    name_acronym: 'VER',
    team_name: 'Red Bull Racing',
    team_color: '3671C6',
    first_name: 'Max',
    last_name: 'Verstappen',
    country_code: 'NED'
  },
  {
    driver_number: 4,
    broadcast_name: 'L NORRIS',
    full_name: 'Lando Norris',
    name_acronym: 'NOR',
    team_name: 'McLaren',
    team_color: 'FF8000',
    first_name: 'Lando',
    last_name: 'Norris',
    country_code: 'GBR'
  }
];

const DRIVERS_2024: Driver[] = [
  {
    driver_number: 1,
    broadcast_name: 'M VERSTAPPEN',
    full_name: 'Max Verstappen',
    name_acronym: 'VER',
    team_name: 'Red Bull Racing',
    team_color: '3671C6',
    first_name: 'Max',
    last_name: 'Verstappen',
    country_code: 'NED'
  },
  {
    driver_number: 47,
    broadcast_name: 'M SCHUMACHER',
    full_name: 'Mick Schumacher',
    name_acronym: 'MSC',
    team_name: 'Mercedes',
    team_color: '27F4D2',
    first_name: 'Mick',
    last_name: 'Schumacher',
    country_code: 'GER'
  }
];

const SESSIONS: Session[] = [
  { session_key: 20261, meeting_key: 1, year: 2026, session_name: 'Race', session_type: 'Race', date_start: '2026-03-01T00:00:00Z', date_end: '2026-03-01T02:00:00Z', is_cancelled: false },
  { session_key: 20241, meeting_key: 2, year: 2024, session_name: 'Race', session_type: 'Race', date_start: '2024-03-01T00:00:00Z', date_end: '2024-03-01T02:00:00Z', is_cancelled: false },
  { session_key: 20231, meeting_key: 3, year: 2023, session_name: 'Race', session_type: 'Race', date_start: '2023-03-01T00:00:00Z', date_end: '2023-03-01T02:00:00Z', is_cancelled: false }
];

const SENNA_STANDING: DriverStanding = {
  position: 1,
  points: 90,
  wins: 8,
  driverId: 'senna',
  fullName: 'Ayrton Senna',
  nationality: 'Brazilian',
  constructorId: 'mclaren',
  constructorName: 'McLaren',
  constructors: [{ id: 'mclaren', name: 'McLaren' }],
  wikiTitle: 'Ayrton_Senna'
};

const SCHUMACHER_DRIVERS: JolpicaDriverInfo[] = [
  { driverId: 'michael_schumacher', givenName: 'Michael', familyName: 'Schumacher', fullName: 'Michael Schumacher', code: 'MSC', nationality: 'German', wikiTitle: 'Michael_Schumacher' },
  { driverId: 'ralf_schumacher', givenName: 'Ralf', familyName: 'Schumacher', fullName: 'Ralf Schumacher', code: 'RSC', nationality: 'German', wikiTitle: 'Ralf_Schumacher' },
  { driverId: 'mick_schumacher', givenName: 'Mick', familyName: 'Schumacher', fullName: 'Mick Schumacher', code: 'MSC', nationality: 'German', wikiTitle: 'Mick_Schumacher' }
];

interface SetupOptions {
  seasons?: number[];
  standings?: (season: number) => Promise<DriverStanding[]>;
  allDrivers?: () => Promise<JolpicaDriverInfo[]>;
  images?: Map<string, string>;
  openF1Error?: boolean;
}

describe('DriversComponent', () => {
  let fixture: ComponentFixture<DriversComponent>;
  let component: DriversComponent;
  let jolpicaMock: any;
  let openF1Mock: any;
  let wikipediaMock: any;

  const hexToRgb = (hex: string) => {
    const raw = hex.replace('#', '');
    const num = parseInt(raw, 16);
    return `rgb(${num >> 16}, ${(num >> 8) & 255}, ${num & 255})`;
  };

  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve));
      fixture.detectChanges();
    }
  };

  const create = async (setup: SetupOptions = {}) => {
    const allSeasons = setup.seasons ?? Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i);

    openF1Mock = {
      apiStatus: () => (setup.openF1Error ? 'error' : 'ok'),
      getRaceSessions: vi.fn(() => (setup.openF1Error ? Promise.reject(new Error('OpenF1 down')) : Promise.resolve(SESSIONS))),
      getLatestDrivers: vi.fn(() => Promise.resolve(DRIVERS_2026)),
      getDrivers: vi.fn((key: number) => {
        if (key === 20261) return Promise.resolve(DRIVERS_2026);
        return Promise.resolve(DRIVERS_2024);
      })
    };

    jolpicaMock = {
      apiStatus: signal('ok'),
      getSeasons: vi.fn(() => Promise.resolve(allSeasons)),
      getDriverStandings: vi.fn(setup.standings ?? ((season: number) => {
        if (season === 1988) return Promise.resolve([SENNA_STANDING]);
        return Promise.resolve([]);
      })),
      getAllDrivers: vi.fn(setup.allDrivers ?? (() => Promise.resolve(SCHUMACHER_DRIVERS)))
    };

    wikipediaMock = {
      getImages: vi.fn((titles: string[]) => Promise.resolve(setup.images ?? new Map([['Ayrton_Senna', 'https://img/senna.jpg']]))),
      getBio: vi.fn(() => Promise.resolve(null))
    };

    await TestBed.configureTestingModule({
      imports: [DriversComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: Openf1ServiceService, useValue: openF1Mock },
        { provide: JolpicaService, useValue: jolpicaMock },
        { provide: WikipediaService, useValue: wikipediaMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  const el = () => fixture.nativeElement as HTMLElement;

  it('offers every season since 1950', async () => {
    await create();
    const values = component.years.map(y => y.value);
    expect(values).not.toContain(2026);
    expect(values).toContain(null);
    expect(values).toContain(1950);
  });

  it('shows the latest season in team colours when no year is chosen', async () => {
    await create();
    expect(component.selectedYear).toBeNull();
    expect(component.historicCards).toBeNull();
    // Mostra solo i piloti della stagione più recente (2026)
    expect(component.drivers.length).toBe(2);
    expect(component.drivers.map(d => d.name_acronym)).toEqual(['VER', 'NOR']);
    expect(component.getTeamColor(component.drivers[0])).not.toBe('555555');
    expect(component.getTeamColor(component.drivers[0])).toBe('3671C6');
  });

  it('shows a historic season with teams, colours and positions', async () => {
    await create();
    await component.onYearSelect(1988);
    await settle();

    expect(component.historicCards).toEqual([
      {
        driverId: 'senna',
        name: 'Ayrton Senna',
        team: 'McLaren',
        color: constructorColor('mclaren'),
        badge: 'P1',
        photo: 'https://img/senna.jpg',
        initials: 'AS',
        link: ['/drivers', 'storico', 'senna'],
        flag: undefined
      }
    ]);
  });

  it('uses initials when a historic driver has no photo', async () => {
    await create({ images: new Map() });
    await component.onYearSelect(1988);
    await settle();

    expect(component.historicCards?.[0].photo).toBeUndefined();
    const initialsEl = el().querySelector('.portrait-initials') as HTMLElement;
    expect(initialsEl).toBeTruthy();
    expect(initialsEl.textContent?.trim()).toBe('AS');
    expect(initialsEl.style.background).toContain(hexToRgb(constructorColor('mclaren')));
  });

  it('ignores a season that arrives after another was chosen', async () => {
    let resolve1975!: (value: DriverStanding[]) => void;
    const slowStandings = (season: number) => {
      if (season === 1975) {
        return new Promise<DriverStanding[]>(r => { resolve1975 = r; });
      }
      return Promise.resolve([]);
    };

    await create({ standings: slowStandings });
    component.onYearSelect(1975);
    await settle();

    // L'utente sceglie subito il 2024 (OpenF1) prima che il 1975 sia pronto
    await component.onYearSelect(2024);
    await settle();

    expect(component.selectedYear).toBe(2024);
    expect(component.historicCards).toBeNull();
    expect(component.drivers.map(d => d.name_acronym)).toEqual(['VER', 'MSC']);

    // Ora il 1975 risponde in ritardo
    resolve1975([SENNA_STANDING]);
    await settle();

    expect(component.historicCards).toBeNull();
    expect(component.drivers.map(d => d.name_acronym)).toEqual(['VER', 'MSC']);
  });

  it('searches every driver when no year is chosen', async () => {
    await create();
    component.selectedYear = null;
    component.searchQuery = 'schum';
    await component.onSearch();
    await settle();

    expect(component.historicCards).toHaveLength(3);
    const mick = component.historicCards?.find(c => c.name === 'Mick Schumacher');
    const michael = component.historicCards?.find(c => c.name === 'Michael Schumacher');
    const ralf = component.historicCards?.find(c => c.name === 'Ralf Schumacher');

    // Mick è nella griglia OpenF1 (2024) con sigla MSC
    expect(mick?.link).toEqual(['/drivers', 'MSC']);
    // Gli altri due hanno link storico
    expect(michael?.link).toEqual(['/drivers', 'storico', 'michael_schumacher']);
    expect(ralf?.link).toEqual(['/drivers', 'storico', 'ralf_schumacher']);
  });

  it('limits a broad search to 48 results', async () => {
    const hundredDrivers: JolpicaDriverInfo[] = Array.from({ length: 100 }, (_, i) => ({
      driverId: `driver_${i}`,
      givenName: `Driver`,
      familyName: `Alfa_${i.toString().padStart(3, '0')}`,
      fullName: `Driver Alfa_${i.toString().padStart(3, '0')}`,
      wikiTitle: `Wiki_Alfa_${i}`,
      nationality: 'Italian'
    }));

    await create({ allDrivers: () => Promise.resolve(hundredDrivers) });
    component.selectedYear = null;
    component.searchQuery = 'alfa';
    await component.onSearch();
    await settle();

    expect(component.historicCards?.length).toBe(48);
    expect(component.searchLimited).toBe(true);
    expect(el().textContent).toContain('Affina la ricerca per vedere altri piloti');
    expect(wikipediaMock.getImages).toHaveBeenCalledWith(expect.any(Array));
    const lastImagesCall = wikipediaMock.getImages.mock.calls[wikipediaMock.getImages.mock.calls.length - 1][0];
    expect(lastImagesCall.length).toBe(48);
  });

  it('shows the Jolpica notice when a historic season fails', async () => {
    const failingStandings = vi.fn(() => Promise.reject(new Error('Jolpica offline')));
    await create({ standings: failingStandings });

    await component.onYearSelect(1988);
    await settle();

    const unavailable = fixture.debugElement.query(By.directive(ApiUnavailableComponent));
    expect(unavailable).toBeTruthy();
    expect(unavailable.componentInstance.source).toBe('jolpica');
  });
});
