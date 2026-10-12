import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DriverCareerComponent } from './driver-career.component';
import { CareerTotals, DriverStanding, JolpicaDriverMatch, JolpicaService } from '../../services/jolpica.service';
import { ApiStatus } from '../../services/http-cache';

const YEAR = new Date().getFullYear();
const never = <T>() => new Promise<T>(() => {});

const standing = (driverId: string, position: number, points: number,
  constructors = [{ id: 'mercedes', name: 'Mercedes' }]): DriverStanding => ({
  position, points, wins: 0, driverId, fullName: driverId, nationality: 'British',
  constructorId: constructors[constructors.length - 1].id, constructorName: constructors[constructors.length - 1].name,
  constructors
});

const TOTALS: CareerTotals = {
  races: 397, wins: 106, podiums: 200, poles: 119, fastestLaps: 69,
  debut: { season: 2007, raceName: 'Australian Grand Prix' }
};

interface Setup {
  findDriver?: (acronym: string) => Promise<JolpicaDriverMatch | null>;
  totals?: CareerTotals;
  seasons?: number[];
  standings?: (season: number) => Promise<DriverStanding[]>;
  round?: number;
  raceCount?: number;
}

describe('DriverCareerComponent', () => {
  let fixture: ComponentFixture<DriverCareerComponent>;
  let component: DriverCareerComponent;
  let jolpica: Record<string, any>;

  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve));
      fixture.detectChanges();
    }
  };

  const create = async (setup: Setup = {}, acronym = 'HAM', fullName = 'Lewis HAMILTON') => {
    jolpica = {
      apiStatus: signal<ApiStatus>('ok'),
      findDriver: vi.fn(setup.findDriver ?? (() => Promise.resolve({ driverId: 'hamilton', nationality: 'British' }))),
      getCareerTotals: vi.fn(() => Promise.resolve(setup.totals ?? TOTALS)),
      getDriverSeasons: vi.fn(() => Promise.resolve(setup.seasons ?? [2008, 2007])),
      getDriverStandings: vi.fn(setup.standings ?? (() => Promise.resolve([]))),
      getStandingsRound: vi.fn(() => Promise.resolve(setup.round ?? 24)),
      getSeasonRaceCount: vi.fn(() => Promise.resolve(setup.raceCount ?? 24))
    };
    await TestBed.configureTestingModule({
      imports: [DriverCareerComponent, NoopAnimationsModule],
      providers: [{ provide: JolpicaService, useValue: jolpica }]
    }).compileComponents();

    fixture = TestBed.createComponent(DriverCareerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('acronym', acronym);
    fixture.componentRef.setInput('fullName', fullName);
    await settle();
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const row = (season: number) => el().querySelector(`tr[data-season="${season}"]`) as HTMLElement | null;

  it('shows totals before the seasons arrive', async () => {
    await create({ standings: () => never() });

    expect(text()).toContain('106');
    expect(text()).toContain('200');
    expect(text()).toContain('Australian Grand Prix 2007');
    expect(el().querySelectorAll('.career-item .skeleton').length).toBe(2);
  });

  it('sums points and counts titles once every season is loaded', async () => {
    await create({
      standings: season => Promise.resolve(season === 2008
        ? [standing('hamilton', 1, 98, [{ id: 'mclaren', name: 'McLaren' }])]
        : [standing('alonso', 1, 109), standing('hamilton', 2, 109, [{ id: 'mclaren', name: 'McLaren' }])])
    });

    expect(component.totalPoints).toBe(207);
    expect(component.titleYears).toEqual([2008]);
    expect(row(2008)?.classList).toContain('champion');
    expect(row(2007)?.classList).not.toContain('champion');
  });

  it('does not count a title in the season in progress', async () => {
    await create({ seasons: [YEAR], round: 19, raceCount: 24, standings: () => Promise.resolve([standing('hamilton', 1, 300)]) });

    expect(component.titleYears).toEqual([]);
    expect(row(YEAR)?.textContent).toContain('in corso');
    expect(row(YEAR)?.classList).not.toContain('champion');
  });

  it('counts the current season once its last round is done', async () => {
    await create({ seasons: [YEAR], round: 24, raceCount: 24, standings: () => Promise.resolve([standing('hamilton', 1, 300)]) });

    expect(component.titleYears).toEqual([YEAR]);
  });

  it('treats a driver missing from a season standings as ready, not failed', async () => {
    await create({
      standings: season => Promise.resolve(season === 2008 ? [standing('hamilton', 3, 50)] : [standing('alonso', 1, 109)])
    });

    expect(component.seasons.find(s => s.season === 2007)?.state).toBe('ready');
    expect(row(2007)?.querySelector('.cell-pos')?.textContent?.trim()).toBe('—');
    expect(component.totalPoints).toBe(50);
  });

  it('hides totals and offers retry when a season fails', async () => {
    let failing = true;
    await create({
      standings: season => season === 2007 && failing
        ? Promise.reject(new Error('down'))
        : Promise.resolve([standing('hamilton', season === 2008 ? 1 : 2, 100)])
    });

    expect(component.totalPoints).toBeNull();
    const points = Array.from(el().querySelectorAll('.career-item')).find(i => i.textContent?.includes('Punti Totali'));
    expect(points?.querySelector('.career-value')?.textContent?.trim()).toBe('—');
    const retry = el().querySelector('.career-retry') as HTMLButtonElement;
    expect(retry).toBeTruthy();

    failing = false;
    jolpica['getDriverStandings'].mockClear();
    retry.click();
    await settle();

    expect(jolpica['getDriverStandings']).toHaveBeenCalledTimes(1);
    expect(jolpica['getDriverStandings']).toHaveBeenCalledWith(2007);
    expect(component.totalPoints).toBe(200);
  });

  it('shows the Jolpica notice when the lookup fails', async () => {
    let fail = true;
    await create({ findDriver: () => fail ? Promise.reject(new Error('down')) : Promise.resolve({ driverId: 'hamilton', nationality: 'British' }) });

    expect(el().querySelector('app-api-unavailable')).toBeTruthy();

    fail = false;
    await component.retry();
    await settle();
    expect(el().querySelector('app-api-unavailable')).toBeNull();
    expect(text()).toContain('106');
  });

  it('shows the no-races message when the driver is not found', async () => {
    await create({ findDriver: () => Promise.resolve(null) });

    expect(text()).toContain('Questo pilota non ha ancora disputato gare in F1.');
  });

  it('shows the no-races message when the driver has no races', async () => {
    await create({ totals: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 } });

    expect(text()).toContain('Questo pilota non ha ancora disputato gare in F1.');
  });

  it('emits the Jolpica nationality', async () => {
    const emitted: string[] = [];
    await create({ findDriver: () => never() });
    component.nationality.subscribe(n => emitted.push(n));
    jolpica['findDriver'].mockImplementation(() => Promise.resolve({ driverId: 'hamilton', nationality: 'British' }));
    fixture.componentRef.setInput('acronym', 'HAM2');
    await settle();

    expect(emitted).toEqual(['British']);
  });

  it('ignores results of a previous driver', async () => {
    let releaseFirst!: (rows: DriverStanding[]) => void;
    await create({
      seasons: [2008],
      standings: () => new Promise(resolve => { releaseFirst = resolve; })
    });

    jolpica['findDriver'].mockImplementation(() => Promise.resolve({ driverId: 'antonelli', nationality: 'Italian' }));
    jolpica['getDriverSeasons'].mockImplementation(() => Promise.resolve([2025]));
    jolpica['getDriverStandings'].mockImplementation(() => Promise.resolve([standing('antonelli', 7, 150)]));
    fixture.componentRef.setInput('acronym', 'ANT');
    fixture.componentRef.setInput('fullName', 'Andrea Kimi ANTONELLI');
    await settle();

    releaseFirst([standing('hamilton', 1, 98)]);
    await settle();

    expect(component.seasons.map(s => s.season)).toEqual([2025]);
    expect(component.totalPoints).toBe(150);
  });

  it('shows every constructor of a season', async () => {
    await create({
      seasons: [2025],
      standings: () => Promise.resolve([standing('hamilton', 14, 38, [{ id: 'rb', name: 'RB F1 Team' }, { id: 'red_bull', name: 'Red Bull' }])])
    });

    expect(row(2025)?.textContent).toContain('RB F1 Team / Red Bull');
  });
});
