import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { StandingsComponent } from './standings.component';
import { ConstructorStanding, DriverStanding, JolpicaService } from '../../services/jolpica.service';
import { Openf1ServiceService } from '../../services/openf1-service';
import { ApiStatus } from '../../services/http-cache';

const driver = (position: number, fullName: string, extra: Partial<DriverStanding> = {}): DriverStanding => ({
  position, points: 100 - position, wins: 0, driverId: `d${position}`, fullName, nationality: 'Italian',
  constructorId: 'ferrari', constructorName: 'Ferrari', ...extra
});

interface Setup {
  latest?: number;
  drivers?: (season: number) => Promise<DriverStanding[]>;
  constructors?: (season: number) => Promise<ConstructorStanding[]>;
  failInit?: boolean;
  status?: ApiStatus;
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
      getConstructorStandings: setup.constructors ?? (() => Promise.resolve([]))
    };
    await TestBed.configureTestingModule({
      imports: [StandingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: JolpicaService, useValue: jolpica },
        { provide: Openf1ServiceService, useValue: { getLatestDrivers: () => Promise.resolve([]) } }
      ]
    }).compileComponents();

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

  it('links drivers only from 2023 and only with a code', async () => {
    await create();
    component.selectedSeason = 2024;
    expect(component.driverLink(driver(1, 'Lando Norris', { code: 'NOR' }))).toEqual(['/drivers', 'NOR']);
    component.selectedSeason = 1988;
    expect(component.driverLink(driver(1, 'Ayrton Senna'))).toBeNull();
    component.selectedSeason = 2019;
    expect(component.driverLink(driver(1, 'Lewis Hamilton', { code: 'HAM' }))).toBeNull();
  });

  it('shows initials for historic drivers without a photo', async () => {
    await create({ latest: 1988, drivers: () => Promise.resolve([driver(1, 'Ayrton Senna'), driver(2, 'Alain Prost'), driver(3, 'Gerhard Berger')]) });

    const winner = (fixture.nativeElement as HTMLElement).querySelector('.podium-item.first');
    expect(winner?.querySelector('.podium-initials')?.textContent?.trim()).toBe('AS');
    expect(winner?.querySelector('img')).toBeNull();
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

  it('shows the Jolpica notice when the API is down', async () => {
    await create({ failInit: true, status: 'error' });
    const notice = (fixture.nativeElement as HTMLElement).querySelector('app-api-unavailable');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('Jolpica');
  });
});
