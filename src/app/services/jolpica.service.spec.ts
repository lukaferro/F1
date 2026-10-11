import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';

import { jolpicaTtl, JolpicaService } from './jolpica.service';

const API = 'https://api.jolpi.ca/ergast/f1';

// Risposta finta con la forma reale di Jolpica
const driverRow = (i: number, extra: object = {}) => ({
  position: String(i), positionText: String(i), points: String(100 - i), wins: '0',
  Driver: { driverId: `d${i}`, givenName: 'Nome', familyName: `Pilota${i}`, nationality: 'Italian' },
  Constructors: [{ constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian' }],
  ...extra
});
const driverStandings = (season: string, rows: object[], total = rows.length) => ({
  MRData: { total: String(total), StandingsTable: { season, StandingsLists: rows.length ? [{ season, DriverStandings: rows }] : [] } }
});

describe('JolpicaService', () => {
  let service: JolpicaService;
  let http: HttpTestingController;

  // la coda distanzia le richieste: aspettiamo che quella cercata sia partita
  const request = async (url: string): Promise<TestRequest> => {
    for (let i = 0; i < 100; i++) {
      const found = http.match(url);
      if (found.length) return found[0];
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return http.expectOne(url);
  };

  beforeEach(() => {
    Object.keys(localStorage).filter(k => k.startsWith('jolpica:')).forEach(k => localStorage.removeItem(k));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(JolpicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('normalizes driver standings', async () => {
    const result = service.getDriverStandings(2026);
    (await request(`${API}/2026/driverstandings/?limit=100&offset=0`)).flush(driverStandings('2026', [{
      position: '1', positionText: '1', points: '340', wins: '8',
      Driver: { driverId: 'antonelli', code: 'ANT', givenName: 'Andrea Kimi', familyName: 'Antonelli', nationality: 'Italian' },
      Constructors: [{ constructorId: 'mercedes', name: 'Mercedes', nationality: 'German' }]
    }]));

    const [first] = await result;
    expect(first).toEqual(expect.objectContaining({
      position: 1, points: 340, wins: 8, fullName: 'Andrea Kimi Antonelli', code: 'ANT', constructorId: 'mercedes'
    }));
  });

  it('uses the last constructor of the season', async () => {
    const result = service.getDriverStandings(2024);
    (await request(`${API}/2024/driverstandings/?limit=100&offset=0`)).flush(driverStandings('2024', [driverRow(1, {
      Constructors: [
        { constructorId: 'rb', name: 'RB F1 Team', nationality: 'Italian' },
        { constructorId: 'red_bull', name: 'Red Bull', nationality: 'Austrian' }
      ]
    })]));

    const [first] = await result;
    expect(first.constructorId).toBe('red_bull');
    expect(first.constructorName).toBe('Red Bull');
  });

  it('pages through standings longer than 100 rows', async () => {
    const result = service.getDriverStandings(1953);
    const firstPage = Array.from({ length: 100 }, (_, i) => driverRow(i + 1));
    const secondPage = Array.from({ length: 20 }, (_, i) => driverRow(i + 101));
    (await request(`${API}/1953/driverstandings/?limit=100&offset=0`)).flush(driverStandings('1953', firstPage, 120));
    (await request(`${API}/1953/driverstandings/?limit=100&offset=100`)).flush(driverStandings('1953', secondPage, 120));

    expect((await result).length).toBe(120);
  });

  it('returns no constructor standings before 1958', async () => {
    const result = service.getConstructorStandings(1955);
    (await request(`${API}/1955/constructorstandings/?limit=100`)).flush({
      MRData: { total: '0', StandingsTable: { season: '1955', StandingsLists: [] } }
    });

    expect(await result).toEqual([]);
  });

  it('falls back to the previous year when the current season has no standings', async () => {
    const result = service.getLatestSeasonWithStandings();
    (await request(`${API}/current/driverstandings/?limit=1`)).flush(driverStandings('2027', []));

    expect(await result).toBe(2026);
  });

  it('lists seasons newest first', async () => {
    const result = service.getSeasons();
    (await request(`${API}/seasons/?limit=100&offset=0`)).flush({
      MRData: { total: '3', SeasonTable: { Seasons: [{ season: '1950' }, { season: '1951' }, { season: '2026' }] } }
    });

    expect(await result).toEqual([2026, 1951, 1950]);
  });

  it('pages through more than 100 seasons', async () => {
    const result = service.getSeasons();
    const season = (y: number) => ({ season: String(y) });
    (await request(`${API}/seasons/?limit=100&offset=0`)).flush({
      MRData: { total: '102', SeasonTable: { Seasons: Array.from({ length: 100 }, (_, i) => season(1950 + i)) } }
    });
    (await request(`${API}/seasons/?limit=100&offset=100`)).flush({
      MRData: { total: '102', SeasonTable: { Seasons: [season(2050), season(2051)] } }
    });

    const seasons = await result;
    expect(seasons.length).toBe(102);
    expect(seasons[0]).toBe(2051);
  });

  it('keeps finished seasons for a week and the current season for an hour', () => {
    expect(jolpicaTtl(`${API}/2019/driverstandings/?limit=100&offset=0`, 2026)).toBe(604_800_000);
    expect(jolpicaTtl(`${API}/2026/driverstandings/?limit=100&offset=0`, 2026)).toBe(3_600_000);
    expect(jolpicaTtl(`${API}/current/driverstandings/?limit=1`, 2026)).toBe(3_600_000);
    expect(jolpicaTtl(`${API}/seasons/?limit=100`, 2026)).toBe(3_600_000);
  });
});
