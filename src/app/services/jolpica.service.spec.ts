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

  it('adds every constructor of the season', async () => {
    const result = service.getDriverStandings(2025);
    (await request(`${API}/2025/driverstandings/?limit=100&offset=0`)).flush(driverStandings('2025', [driverRow(1, {
      Constructors: [
        { constructorId: 'rb', name: 'RB F1 Team', nationality: 'Italian' },
        { constructorId: 'red_bull', name: 'Red Bull', nationality: 'Austrian' }
      ]
    })]));

    const [first] = await result;
    expect(first.constructors).toEqual([{ id: 'rb', name: 'RB F1 Team' }, { id: 'red_bull', name: 'Red Bull' }]);
    expect(first.constructorId).toBe('red_bull');
  });

  describe('career', () => {
    const year = new Date().getFullYear();
    const driversOf = (season: number, drivers: object[]) => ({
      MRData: { total: String(drivers.length), DriverTable: { season: String(season), Drivers: drivers } }
    });
    const races = (total: number, first?: { season: string; raceName: string }) => ({
      MRData: { total: String(total), RaceTable: { Races: first ? [first] : [] } }
    });

    it('finds a driver by code in the most recent season', async () => {
      const result = service.findDriver('VER', 'Max VERSTAPPEN');
      (await request(`${API}/${year}/drivers/?limit=100`)).flush(driversOf(year, [
        { driverId: 'norris', code: 'NOR', givenName: 'Lando', familyName: 'Norris', nationality: 'British' },
        { driverId: 'max_verstappen', code: 'VER', givenName: 'Max', familyName: 'Verstappen', nationality: 'Dutch' }
      ]));

      expect(await result).toEqual({ driverId: 'max_verstappen', nationality: 'Dutch' });
    });

    it('falls back to earlier seasons and to the family name without accents', async () => {
      const result = service.findDriver('HUL', 'Nico HULKENBERG');
      (await request(`${API}/${year}/drivers/?limit=100`)).flush(driversOf(year, []));
      (await request(`${API}/${year - 1}/drivers/?limit=100`)).flush(driversOf(year - 1, [
        { driverId: 'hulkenberg', givenName: 'Nico', familyName: 'Hülkenberg', nationality: 'German' }
      ]));

      expect(await result).toEqual({ driverId: 'hulkenberg', nationality: 'German' });
    });

    it('returns null when no season since 2023 has the driver', async () => {
      const result = service.findDriver('XYZ', 'Nobody Here');
      for (let season = year; season >= 2023; season--) {
        (await request(`${API}/${season}/drivers/?limit=100`)).flush(driversOf(season, []));
      }

      expect(await result).toBeNull();
    });

    it('reads career totals from MRData.total', async () => {
      const result = service.getCareerTotals('hamilton');
      const base = `${API}/drivers/hamilton`;
      (await request(`${base}/results/?limit=1`)).flush(races(397, { season: '2007', raceName: 'Australian Grand Prix' }));
      (await request(`${base}/results/1/?limit=1`)).flush(races(106));
      (await request(`${base}/results/2/?limit=1`)).flush(races(50));
      (await request(`${base}/results/3/?limit=1`)).flush(races(44));
      (await request(`${base}/qualifying/1/?limit=1`)).flush(races(119));
      (await request(`${base}/fastest/1/results/?limit=1`)).flush(races(69));

      expect(await result).toEqual({
        races: 397, wins: 106, podiums: 200, poles: 119, fastestLaps: 69,
        debut: { season: 2007, raceName: 'Australian Grand Prix' }
      });
    });

    it('has no debut when the driver has no races', async () => {
      const result = service.getCareerTotals('rookie');
      for (const path of ['results/', 'results/1/', 'results/2/', 'results/3/', 'qualifying/1/', 'fastest/1/results/']) {
        (await request(`${API}/drivers/rookie/${path}?limit=1`)).flush(races(0));
      }

      const totals = await result;
      expect(totals.races).toBe(0);
      expect(totals.debut).toBeUndefined();
    });

    it('lists driver seasons from the most recent', async () => {
      const result = service.getDriverSeasons('hamilton');
      (await request(`${API}/drivers/hamilton/seasons/?limit=100`)).flush({
        MRData: { total: '3', SeasonTable: { Seasons: [{ season: '2007' }, { season: '2008' }, { season: '2026' }] } }
      });

      expect(await result).toEqual([2026, 2008, 2007]);
    });

    it('reads the race count of a season', async () => {
      const result = service.getSeasonRaceCount(2026);
      (await request(`${API}/2026/races/?limit=1`)).flush(races(24));

      expect(await result).toBe(24);
    });

    it('reads the round of the standings', async () => {
      const result = service.getStandingsRound(2026);
      (await request(`${API}/2026/driverstandings/?limit=100&offset=0`)).flush({
        MRData: { total: '1', StandingsTable: { season: '2026', StandingsLists: [{ season: '2026', round: '19', DriverStandings: [driverRow(1)] }] } }
      });

      expect(await result).toBe(19);
    });

    it('reads round 0 when the standings are empty', async () => {
      const result = service.getStandingsRound(2027);
      (await request(`${API}/2027/driverstandings/?limit=100&offset=0`)).flush(driverStandings('2027', []));

      expect(await result).toBe(0);
    });
  });
});
