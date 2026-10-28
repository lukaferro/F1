import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { StandingsComponent } from './standings.component';
import { ConstructorStanding, DriverStanding, JolpicaService, SeasonRoundPoints } from '../../services/jolpica.service';
import { StandingsStateService, StandingsTab } from '../../services/standings-state.service';
import { Openf1ServiceService } from '../../services/openf1-service';
import { ApiStatus } from '../../services/http-cache';
import { HttpErrorResponse } from '@angular/common/http';

const driver = (position: number, fullName: string, extra: Partial<DriverStanding> = {}): DriverStanding => ({
  position, points: 100 - position, wins: 0, driverId: `d${position}`, fullName, nationality: 'Italian',
  constructorId: 'ferrari', constructorName: 'Ferrari', constructors: [{ id: 'ferrari', name: 'Ferrari' }], ...extra
});

interface Setup {
  latest?: number;
  drivers?: (season: number) => Promise<DriverStanding[]>;
  constructors?: (season: number) => Promise<ConstructorStanding[]>;
  rounds?: (season: number) => Promise<SeasonRoundPoints[]>;
  failInit?: boolean;
  grid?: object[];
  status?: ApiStatus;
  initialState?: { selectedSeason: number | null; tab: StandingsTab };
}

describe('StandingsComponent', () => {
  let fixture: ComponentFixture<StandingsComponent>;
  let component: StandingsComponent;

  const create = async (setup: Setup = {}) => {
    const latest = setup.latest ?? 2026;
    const jolpica = {
      apiStatus: signal<ApiStatus>(setup.status ?? 'ok'),
      getSeasons: () => setup.failInit ? Promise.reject(new Error('down')) : Promise.resolve([2026, 2025, 2024, 1988, 1955]),
      getLatestSeasonWithStandings: () => setup.failInit ? Promise.reject(new Error('down')) : Promise.resolve(latest),
      getDriverStandings: setup.drivers ?? (() => Promise.resolve([])),
      getConstructorStandings: setup.constructors ?? (() => Promise.resolve([])),
      getSeasonPointsByRound: setup.rounds ?? (() => Promise.resolve([]))
    };
    await TestBed.configureTestingModule({
      imports: [StandingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpica },
        { provide: Openf1ServiceService, useValue: { getLatestDrivers: () => Promise.resolve(setup.grid ?? []) } }
      ]
    }).compileComponents();

    const stateService = TestBed.inject(StandingsStateService);
    stateService.reset();
    if (setup.initialState) {
      stateService.selectedSeason = setup.initialState.selectedSeason;
      stateService.tab = setup.initialState.tab;
    }

    fixture = TestBed.createComponent(StandingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('shows the latest season podium and table', async () => {
    const five = [1, 2, 3, 4, 5].map(p => driver(p, `Pilota ${p}`, { code: `P0${p}` }));
    await create({ drivers: () => Promise.resolve(five) });

    const el = fixture.nativeElement as HTMLElement;
    expect(component.selectedSeason).toBe(2026);
    expect(el.querySelectorAll('.podium-item').length).toBe(3);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('links recent drivers by code and the others to their historic page', async () => {
    await create();
    component.selectedSeason = 2024;
    expect(component.driverLink(driver(1, 'Lando Norris', { code: 'NOR' }))).toEqual(['/drivers', 'NOR']);
    component.selectedSeason = 1988;
    expect(component.driverLink(driver(1, 'Ayrton Senna', { driverId: 'senna' }))).toEqual(['/drivers', 'storico', 'senna']);
    component.selectedSeason = 2019;
    expect(component.driverLink(driver(1, 'Lewis Hamilton', { code: 'HAM', driverId: 'hamilton' }))).toEqual(['/drivers', 'storico', 'hamilton']);
  });

  it('shows initials for historic drivers without a photo', async () => {
    await create({ latest: 1988, drivers: () => Promise.resolve([driver(1, 'Ayrton Senna'), driver(2, 'Alain Prost'), driver(3, 'Gerhard Berger')]) });

    const winner = (fixture.nativeElement as HTMLElement).querySelector('.podium-item.first');
    expect(winner?.querySelector('.podium-initials')?.textContent?.trim()).toBe('AS');
    expect(winner?.querySelector('.podium-visual img')).toBeNull(); // nessuna foto (il logo della squadra può esserci)
  });

  it('says when a season has no standings yet', async () => {
    await create({ drivers: () => Promise.resolve([]) });
    expect(text()).toContain('Classifica non ancora disponibile per questa stagione.');
  });

  it('explains that the constructors championship starts in 1958', async () => {
    await create({ latest: 1955, drivers: () => Promise.resolve([driver(1, 'Juan Manuel Fangio')]) });
    await component.setTab('constructors');
    fixture.detectChanges();
    expect(text()).toContain('Il campionato costruttori è stato istituito nel 1958.');
  });

  it('ignores a late response for a season no longer selected', async () => {
    const pending = new Map<number, (rows: DriverStanding[]) => void>();
    await create({
      drivers: season => season === 2026
        ? Promise.resolve([])
        : new Promise(resolve => pending.set(season, resolve))
    });

    const first = component.selectSeason(2025);
    const second = component.selectSeason(2024);
    pending.get(2024)!([driver(1, 'Max Verstappen')]);
    await second;
    pending.get(2025)!([driver(1, 'Lando Norris')]);
    await first;

    expect(component.selectedSeason).toBe(2024);
    expect(component.driverStandings.map(d => d.fullName)).toEqual(['Max Verstappen']);
  });

  it('retry keeps the season the user picked', async () => {
    let calls1988 = 0;
    await create({
      drivers: season => {
        if (season !== 1988) return Promise.resolve([driver(1, 'Andrea Kimi Antonelli')]);
        calls1988++;
        return calls1988 === 1 ? Promise.reject(new Error('down')) : Promise.resolve([driver(1, 'Ayrton Senna')]);
      }
    });

    await component.selectSeason(1988);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-api-unavailable')).not.toBeNull();

    await component.retry();
    fixture.detectChanges();
    expect(component.selectedSeason).toBe(1988);
    expect(component.driverStandings.map(d => d.fullName)).toEqual(['Ayrton Senna']);
  });

  it('a failed constructors load does not block the drivers tab', async () => {
    await create({
      drivers: () => Promise.resolve([driver(1, 'Andrea Kimi Antonelli')]),
      constructors: () => Promise.reject(new Error('down'))
    });

    await component.setTab('constructors');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-api-unavailable')).not.toBeNull();

    await component.setTab('drivers');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-api-unavailable')).toBeNull();
    expect(el.querySelectorAll('.podium-item').length).toBe(1);
  });

  const headshot = (code: string) =>
    `https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/X/${code}_X/${code}.png.transform/1col/image.png`;

  it('uses the OpenF1 photo only when the OpenF1 team matches the season team', async () => {
    await create({
      grid: [
        { name_acronym: 'HAM', team_name: 'Ferrari', team_color: 'ED1131', headshot_url: headshot('lewham01') },
        { name_acronym: 'RUS', team_name: 'Mercedes', team_color: '00D7B6', headshot_url: headshot('georus01') }
      ],
      drivers: () => Promise.resolve([
        driver(1, 'Lewis Hamilton', { code: 'HAM', constructorId: 'ferrari' }),
        driver(2, 'George Russell', { code: 'RUS', constructorId: 'williams' })
      ])
    });

    const ham = component.driverStandings[0];
    const rus = component.driverStandings[1];
    expect(component.photoFor(ham)).toContain('lewham01');
    expect(component.photoFor(rus)).toBeUndefined();
    expect(component.driverColor(rus)).toBe(component.colorFor('williams'));
  });

  it('treats a season Jolpica does not have (404) as no standings, not as an outage', async () => {
    await create({ drivers: () => Promise.reject(new HttpErrorResponse({ status: 404, statusText: 'Not Found' })) });
    expect((fixture.nativeElement as HTMLElement).querySelector('app-api-unavailable')).toBeNull();
    expect(text()).toContain('Classifica non ancora disponibile per questa stagione.');
  });

  it('says requests are queued when loading takes more than 3 seconds', async () => {
    await create({ drivers: () => Promise.resolve([driver(1, 'Andrea Kimi Antonelli')]) });
    vi.useFakeTimers();
    try {
      component['jolpica'].getDriverStandings = () => new Promise(() => {});
      component.selectSeason(2025);
      fixture.detectChanges();
      expect(text()).not.toContain('Molte richieste in corso');
      await vi.advanceTimersByTimeAsync(3000);
      fixture.detectChanges();
      expect(text()).toContain('Molte richieste in corso');
    } finally {
      vi.useRealTimers();
    }
  });

  it('links each tab to its panel for screen readers', async () => {
    await create({ drivers: () => Promise.resolve([driver(1, 'Andrea Kimi Antonelli')]) });
    const el = fixture.nativeElement as HTMLElement;
    const tab = el.querySelector('[role=tab][aria-selected=true]');
    const panel = el.querySelector('[role=tabpanel]');
    expect(panel?.id).toBeTruthy();
    expect(tab?.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('shows constructor logos on the podium, initials when there is none', async () => {
    const team = (position: number, constructorId: string, name: string) =>
      ({ position, points: 100 - position, wins: 0, constructorId, name, nationality: 'British' });
    await create({
      drivers: () => Promise.resolve([driver(1, 'Andrea Kimi Antonelli')]),
      constructors: () => Promise.resolve([team(1, 'mercedes', 'Mercedes'), team(2, 'ferrari', 'Ferrari'), team(3, 'tyrrell', 'Tyrrell')])
    });
    await component.setTab('constructors');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.podium-item.first img.podium-logo')?.getAttribute('src')).toContain('2026mercedeslogowhite');
    expect(el.querySelector('.podium-item.third .podium-initials')?.textContent?.trim()).toBe('T');
  });

  it('shows the team logo next to each driver in the table', async () => {
    const five = [1, 2, 3, 4, 5].map(p => driver(p, `Pilota ${p}`, { constructorId: 'ferrari' }));
    await create({ drivers: () => Promise.resolve(five) });
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody img.team-logo').length).toBe(2);
  });

  it('colours historic drivers with their team colour', async () => {
    await create({ latest: 1988, drivers: () => Promise.resolve([driver(1, 'Nelson Piquet', { constructorId: 'brabham-bmw' })]) });
    const piquet = component.driverStandings[0];
    expect(component.driverColor(piquet)).toBe(component.colorFor('brabham'));
    expect(component.colorFor('brabham')).not.toBe('666666');
  });

  it('shows the Jolpica notice when the API is down', async () => {
    await create({ failInit: true, status: 'error' });
    const notice = (fixture.nativeElement as HTMLElement).querySelector('app-api-unavailable');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('Jolpica');
  });

  it('persists selectedSeason and tab to StandingsStateService', async () => {
    await create();
    await component.selectSeason(1988);
    await component.setTab('constructors');

    const state = TestBed.inject(StandingsStateService);
    expect(state.selectedSeason).toBe(1988);
    expect(state.tab).toBe('constructors');
  });

  it('restores selectedSeason and tab from StandingsStateService on init', async () => {
    await create({ initialState: { selectedSeason: 1988, tab: 'constructors' } });
    expect(component.selectedSeason).toBe(1988);
    expect(component.tab).toBe('constructors');
  });

  it('renders the Hall of Fame tab and opens a season when selected', async () => {
    await create({
      drivers: season => Promise.resolve([driver(1, season === 1988 ? 'Ayrton Senna' : 'Max Verstappen')])
    });
    await component.setTab('hall-of-fame');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-hall-of-fame')).not.toBeNull();

    await component.openSeasonFromHallOfFame(1988);
    fixture.detectChanges();
    expect(component.tab).toBe('drivers');
    expect(component.selectedSeason).toBe(1988);
    expect(component.driverStandings[0]?.fullName).toBe('Ayrton Senna');
  });

  it('builds and renders the points progression chart when round data is available', async () => {
    const sampleRounds: SeasonRoundPoints[] = [
      {
        round: 1,
        raceName: 'Bahrain Grand Prix',
        locality: 'Sakhir',
        country: 'Bahrain',
        date: '2026-03-08',
        driverPoints: { d1: 25, d2: 18 },
        constructorPoints: { ferrari: 43 }
      },
      {
        round: 2,
        raceName: 'Saudi Arabian Grand Prix',
        locality: 'Jeddah',
        country: 'Saudi Arabia',
        date: '2026-03-15',
        driverPoints: { d1: 18, d2: 25 },
        constructorPoints: { ferrari: 43 }
      }
    ];

    await create({
      drivers: () => Promise.resolve([
        driver(1, 'Charles Leclerc', { driverId: 'd1', code: 'LEC' }),
        driver(2, 'Lewis Hamilton', { driverId: 'd2', code: 'HAM' })
      ]),
      rounds: () => Promise.resolve(sampleRounds)
    });

    const chart = component.progressionChart;
    expect(chart).not.toBeNull();
    expect(chart?.series.length).toBe(2);
    expect(chart?.series[0].totalPoints).toBe(43);
    expect(chart?.series[1].dashed).toBe(true); // secondo pilota stesso team

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.progression-svg')).not.toBeNull();
    expect(el.querySelectorAll('.legend-pill').length).toBe(2);
  });

  it('switches to simulator tab and renders championship simulator', async () => {
    await create();
    const el = fixture.nativeElement as HTMLElement;
    const simTabBtn = el.querySelector('#tab-simulator') as HTMLButtonElement;
    expect(simTabBtn).not.toBeNull();
    simTabBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tab).toBe('simulator');
    expect(el.querySelector('app-standings-simulator')).not.toBeNull();
  });
});
