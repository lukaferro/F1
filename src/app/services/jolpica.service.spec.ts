import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';

import { jolpicaTtl, JolpicaService, wikiTitleFromUrl } from './jolpica.service';

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

  it('reads the wikipedia title from a driver url', () => {
    expect(wikiTitleFromUrl('http://en.wikipedia.org/wiki/Ayrton_Senna')).toBe('Ayrton_Senna');
    expect(wikiTitleFromUrl('https://en.wikipedia.org/wiki/Nico_H%C3%BClkenberg')).toBe('Nico_Hülkenberg');
    expect(wikiTitleFromUrl(undefined)).toBeUndefined();
    expect(wikiTitleFromUrl('http://example.com')).toBeUndefined();
  });

  it('adds the wikipedia title to standings', async () => {
    const result = service.getDriverStandings(1988);
    (await request(`${API}/1988/driverstandings/?limit=100&offset=0`)).flush(driverStandings('1988', [driverRow(1, {
      Driver: { driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna', nationality: 'Brazilian', url: 'http://en.wikipedia.org/wiki/Ayrton_Senna' }
    })]));

    expect((await result)[0].wikiTitle).toBe('Ayrton_Senna');
  });

  describe('drivers', () => {
    const senna = {
      driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna', dateOfBirth: '1960-03-21',
      nationality: 'Brazilian', url: 'http://en.wikipedia.org/wiki/Ayrton_Senna'
    };
    const driverTable = (drivers: object[], total = drivers.length) => ({ MRData: { total: String(total), DriverTable: { Drivers: drivers } } });

    it('reads a driver', async () => {
      const result = service.getDriver('hamilton');
      (await request(`${API}/drivers/hamilton/`)).flush(driverTable([{
        driverId: 'hamilton', permanentNumber: '44', code: 'HAM', givenName: 'Lewis', familyName: 'Hamilton',
        dateOfBirth: '1985-01-07', nationality: 'British', url: 'http://en.wikipedia.org/wiki/Lewis_Hamilton'
      }]));

      expect(await result).toEqual({
        driverId: 'hamilton', code: 'HAM', permanentNumber: 44, givenName: 'Lewis', familyName: 'Hamilton',
        fullName: 'Lewis Hamilton', dateOfBirth: '1985-01-07', nationality: 'British', wikiTitle: 'Lewis_Hamilton'
      });
    });

    it('returns null for an unknown driver', async () => {
      const empty = service.getDriver('nobody');
      (await request(`${API}/drivers/nobody/`)).flush(driverTable([]));
      expect(await empty).toBeNull();

      const missing = service.getDriver('ghost');
      (await request(`${API}/drivers/ghost/`)).flush('Not found', { status: 404, statusText: 'Not Found' });
      expect(await missing).toBeNull();
    });

    it('lists every driver across pages', async () => {
      const result = service.getAllDrivers();
      const many = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ ...senna, driverId: `d${from + i}` }));
      (await request(`${API}/drivers/?limit=100&offset=0`)).flush(driverTable(many(0, 100), 120));
      (await request(`${API}/drivers/?limit=100&offset=100`)).flush(driverTable(many(100, 20), 120));

      const drivers = await result;
      expect(drivers.length).toBe(120);
      expect(drivers[0].fullName).toBe('Ayrton Senna');
    });
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

      expect(await result).toEqual({ driverId: 'max_verstappen', nationality: 'Dutch', wikiTitle: undefined });
    });

    it('adds the wikipedia title to a lookup', async () => {
      const result = service.findDriver('HAM', 'Lewis HAMILTON');
      (await request(`${API}/${year}/drivers/?limit=100`)).flush(driversOf(year, [
        { driverId: 'hamilton', code: 'HAM', givenName: 'Lewis', familyName: 'Hamilton', nationality: 'British', url: 'http://en.wikipedia.org/wiki/Lewis_Hamilton' }
      ]));

      expect((await result)?.wikiTitle).toBe('Lewis_Hamilton');
    });

    it('falls back to earlier seasons and to the family name without accents', async () => {
      const result = service.findDriver('HUL', 'Nico HULKENBERG');
      (await request(`${API}/${year}/drivers/?limit=100`)).flush(driversOf(year, []));
      (await request(`${API}/${year - 1}/drivers/?limit=100`)).flush(driversOf(year - 1, [
        { driverId: 'hulkenberg', givenName: 'Nico', familyName: 'Hülkenberg', nationality: 'German' }
      ]));

      expect(await result).toEqual({ driverId: 'hulkenberg', nationality: 'German' });
    });

    it('matches the family name only as a whole word', async () => {
      const result = service.findDriver('HUL', 'Nico HULKENBERG');
      for (let season = year; season >= 2023; season--) {
        (await request(`${API}/${season}/drivers/?limit=100`)).flush(driversOf(season, [
          { driverId: 'berg', givenName: 'Test', familyName: 'Berg', nationality: 'Swedish' }
        ]));
      }

      expect(await result).toBeNull();
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

    it('reads the season races with winner', async () => {
      const result = service.getSeasonRaces(1988);
      (await request(`${API}/1988/results/1/?limit=100`)).flush({
        MRData: {
          total: '1',
          RaceTable: {
            season: '1988',
            Races: [{
              season: '1988',
              round: '1',
              raceName: 'Brazilian Grand Prix',
              Circuit: {
                circuitId: 'jacarepagua',
                circuitName: 'Autódromo Internacional Nelson Piquet',
                Location: { locality: 'Rio de Janeiro', country: 'Brazil' }
              },
              date: '1988-04-03',
              url: 'https://en.wikipedia.org/wiki/1988_Brazilian_Grand_Prix',
              Results: [{
                position: '1',
                Driver: { driverId: 'prost', givenName: 'Alain', familyName: 'Prost' },
                Constructor: { constructorId: 'mclaren', name: 'McLaren' },
                Time: { time: '1:36:06.857' }
              }]
            }]
          }
        }
      });

      const [race] = await result;
      expect(race).toEqual(expect.objectContaining({
        season: 1988,
        round: 1,
        raceName: 'Brazilian Grand Prix',
        circuitId: 'jacarepagua',
        country: 'Brazil',
        winner: {
          driverId: 'prost',
          fullName: 'Alain Prost',
          constructorId: 'mclaren',
          constructorName: 'McLaren',
          time: '1:36:06.857'
        }
      }));
    });

    it('reads full race results', async () => {
      const result = service.getRaceResults(1950, 1);
      (await request(`${API}/1950/1/results/?limit=100`)).flush({
        MRData: {
          RaceTable: {
            season: '1950',
            round: '1',
            Races: [{
              season: '1950',
              round: '1',
              raceName: 'British Grand Prix',
              Circuit: {
                circuitId: 'silverstone',
                circuitName: 'Silverstone Circuit',
                Location: { locality: 'Silverstone', country: 'UK' }
              },
              date: '1950-05-13',
              url: 'http://en.wikipedia.org/wiki/1950_British_Grand_Prix',
              Results: [
                {
                  position: '1',
                  positionText: '1',
                  points: '9',
                  grid: '1',
                  laps: '70',
                  status: 'Finished',
                  Driver: { driverId: 'farina', givenName: 'Nino', familyName: 'Farina', nationality: 'Italian', url: 'http://en.wikipedia.org/wiki/Nino_Farina' },
                  Constructor: { constructorId: 'alfa', name: 'Alfa Romeo' },
                  Time: { time: '2:13:23.600' }
                },
                {
                  position: '2',
                  positionText: '2',
                  points: '6',
                  grid: '2',
                  laps: '70',
                  status: 'Finished',
                  Driver: { driverId: 'fagioli', givenName: 'Luigi', familyName: 'Fagioli', nationality: 'Italian' },
                  Constructor: { constructorId: 'alfa', name: 'Alfa Romeo' },
                  Time: { time: '+2.600' }
                }
              ]
            }]
          }
        }
      });

      const detail = await result;
      expect(detail).not.toBeNull();
      expect(detail?.raceName).toBe('British Grand Prix');
      expect(detail?.results.length).toBe(2);
      expect(detail?.results[0]).toEqual(expect.objectContaining({
        position: 1,
        fullName: 'Nino Farina',
        wikiTitle: 'Nino_Farina',
        time: '2:13:23.600'
      }));
    });

    it('returns null for an unknown race round', async () => {
      const result = service.getRaceResults(1950, 99);
      (await request(`${API}/1950/99/results/?limit=100`)).flush({
        MRData: { RaceTable: { Races: [] } }
      });

      expect(await result).toBeNull();
    });

    it('reads qualifying results when available', async () => {
      const result = service.getRaceQualifying(2006, 1);
      (await request(`${API}/2006/1/qualifying/?limit=100`)).flush({
        MRData: {
          RaceTable: {
            Races: [{
              QualifyingResults: [{
                position: '1',
                Driver: { driverId: 'michael_schumacher', code: 'MSC', givenName: 'Michael', familyName: 'Schumacher' },
                Constructor: { constructorId: 'ferrari', name: 'Ferrari' },
                Q1: '1:33.310',
                Q2: '1:32.025',
                Q3: '1:31.431'
              }]
            }]
          }
        }
      });

      const [q] = await result;
      expect(q).toEqual(expect.objectContaining({
        position: 1,
        driverId: 'michael_schumacher',
        fullName: 'Michael Schumacher',
        q1: '1:33.310',
        q3: '1:31.431'
      }));
    });

    it('returns empty array when qualifying is not available', async () => {
      const result = service.getRaceQualifying(1988, 1);
      (await request(`${API}/1988/1/qualifying/?limit=100`)).flush({
        MRData: { RaceTable: { Races: [] } }
      });

      expect(await result).toEqual([]);
    });
  });
});

