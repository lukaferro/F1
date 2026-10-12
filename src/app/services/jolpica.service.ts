import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpCache } from './http-cache';

// Jolpica: archivio storico della F1 dal 1950 (erede di Ergast). https://github.com/jolpica/jolpica-f1
const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const PAGE_SIZE = 100; // massimo consentito dall'API per richiesta
// Prima stagione coperta da OpenF1: i piloti dell'app si cercano solo da qui in poi
export const FIRST_OPENF1_SEASON = 2023;

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  code?: string;          // sigla a tre lettere: assente per molti piloti storici
  fullName: string;
  nationality: string;
  constructorId: string;  // ultima squadra della stagione
  constructorName: string;
  constructors: { id: string; name: string }[];  // tutte le squadre della stagione, in ordine
  wikiTitle?: string;     // titolo della pagina inglese di Wikipedia
}

/** Anagrafica di un pilota Jolpica (alcuni piloti storici non hanno link Wikipedia o nazionalità) */
export interface JolpicaDriverInfo {
  driverId: string;
  code?: string;
  permanentNumber?: number;
  givenName: string;
  familyName: string;
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  wikiTitle?: string;
}

export interface CareerTotals {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  debut?: { season: number; raceName: string };  // assente se non ha mai corso
}

export interface JolpicaDriverMatch {
  driverId: string;
  nationality: string;
  wikiTitle?: string;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality: string;
}

// Forme delle risposte Jolpica (solo i campi usati)
interface JolpicaConstructor { constructorId: string; name: string; nationality: string; }
interface JolpicaDriver {
  driverId: string; code?: string; permanentNumber?: string; givenName: string; familyName: string;
  dateOfBirth?: string; nationality: string; url?: string;
}
interface JolpicaDriverRow {
  position?: string; points: string; wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
}
interface JolpicaConstructorRow { position?: string; points: string; wins: string; Constructor: JolpicaConstructor; }
interface StandingsResponse<Row> {
  MRData: {
    total: string;
    StandingsTable: { season: string; StandingsLists: Array<{ round?: string; DriverStandings?: Row[]; ConstructorStandings?: Row[] }> };
  };
}
interface SeasonsResponse { MRData: { total?: string; SeasonTable: { Seasons: Array<{ season: string }> } }; }
interface DriversResponse { MRData: { total?: string; DriverTable: { Drivers: JolpicaDriver[] } }; }
interface RacesResponse { MRData: { total: string; RaceTable: { Races: Array<{ season: string; raceName: string }> } }; }

/** Le stagioni concluse non cambiano più (7 giorni); stagione in corso ed elenchi generali 1 ora */
export function jolpicaTtl(url: string, currentYear: number): number {
  const season = Number(url.match(/\/f1\/(\d{4})\//)?.[1]);
  return season && season < currentYear ? 604_800_000 : 3_600_000;
}

// Confronto dei nomi senza accenti né maiuscole (es. "Hülkenberg" e "HULKENBERG")
const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Il cognome deve comparire come parola intera ("berg" non è "Hulkenberg")
const words = (text: string) => ` ${plain(text).replace(/[^a-z]+/g, ' ').trim()} `;
/** "http://en.wikipedia.org/wiki/Ayrton_Senna" → "Ayrton_Senna" */
export function wikiTitleFromUrl(url: string | undefined): string | undefined {
  const title = url?.split('/wiki/')[1];
  if (!title) return undefined;
  try {
    return decodeURIComponent(title);
  } catch {
    return title;
  }
}

const toDriverInfo = (d: JolpicaDriver): JolpicaDriverInfo => ({
  driverId: d.driverId,
  code: d.code,
  permanentNumber: d.permanentNumber ? Number(d.permanentNumber) : undefined,
  givenName: d.givenName,
  familyName: d.familyName,
  fullName: `${d.givenName} ${d.familyName}`,
  dateOfBirth: d.dateOfBirth,
  nationality: d.nationality || undefined,
  wikiTitle: wikiTitleFromUrl(d.url)
});

const toPosition = (value: string | undefined, index: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : index + 1;
};

@Injectable({ providedIn: 'root' })
export class JolpicaService {
  // Limiti Jolpica per indirizzo IP: 4 richieste al secondo e 500 all'ora
  private readonly cache = new HttpCache(inject(HttpClient), {
    prefix: 'jolpica:',
    minGapMs: 550, // Cloudflare risponde 429 già sotto le 4/s dichiarate: circa 18 richieste ogni 10 s
    maxPerWindow: 450, // margine sotto il limite di 500
    windowMs: 3_600_000,
    ttlFor: url => jolpicaTtl(url, new Date().getFullYear())
  });

  /** Stato dell'ultima chiamata a Jolpica (ok / stale / error) */
  readonly apiStatus = this.cache.status;

  /** Tutte le stagioni, dalla più recente */
  async getSeasons(): Promise<number[]> {
    const pages = await this.getAllPages<SeasonsResponse>(offset => `${BASE_URL}/seasons/?limit=${PAGE_SIZE}&offset=${offset}`);
    return pages.flatMap(p => p.MRData.SeasonTable.Seasons).map(s => Number(s.season)).sort((a, b) => b - a);
  }

  // Prima pagina, poi (se MRData.total supera la pagina) le restanti in parallelo
  private async getAllPages<R extends { MRData: { total?: string } }>(pageUrl: (offset: number) => string): Promise<R[]> {
    const first = await this.cache.get<R>(pageUrl(0));
    const total = Number(first.MRData.total) || 0;
    const offsets: number[] = [];
    for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);
    const others = await Promise.all(offsets.map(o => this.cache.get<R>(pageUrl(o))));
    return [first, ...others];
  }

  /** Stagione più recente con una classifica: a inizio anno, prima della prima gara, è quella precedente */
  async getLatestSeasonWithStandings(): Promise<number> {
    const res = await this.cache.get<StandingsResponse<JolpicaDriverRow>>(`${BASE_URL}/current/driverstandings/?limit=1`);
    const table = res.MRData.StandingsTable;
    const season = Number(table.season);
    return table.StandingsLists.length ? season : season - 1;
  }

  async getDriverStandings(season: number): Promise<DriverStanding[]> {
    // Alcune stagioni degli anni '50 superano le 100 righe
    const pages = await this.getAllPages<StandingsResponse<JolpicaDriverRow>>(
      offset => `${BASE_URL}/${season}/driverstandings/?limit=${PAGE_SIZE}&offset=${offset}`);
    const rows = pages.flatMap(r => r.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []);
    return rows.map((row, i) => {
      const team = row.Constructors[row.Constructors.length - 1];
      return {
        position: toPosition(row.position, i),
        points: Number(row.points),
        wins: Number(row.wins),
        driverId: row.Driver.driverId,
        code: row.Driver.code,
        fullName: `${row.Driver.givenName} ${row.Driver.familyName}`,
        nationality: row.Driver.nationality,
        constructorId: team?.constructorId ?? '',
        constructorName: team?.name ?? '',
        constructors: row.Constructors.map(c => ({ id: c.constructorId, name: c.name })),
        wikiTitle: wikiTitleFromUrl(row.Driver.url)
      };
    });
  }

  /** Round a cui è aggiornata la classifica (0 se vuota): stessa richiesta di getDriverStandings */
  async getStandingsRound(season: number): Promise<number> {
    const res = await this.cache.get<StandingsResponse<JolpicaDriverRow>>(`${BASE_URL}/${season}/driverstandings/?limit=${PAGE_SIZE}&offset=0`);
    return Number(res.MRData.StandingsTable.StandingsLists[0]?.round) || 0;
  }

  /** Numero di gare in calendario nella stagione */
  async getSeasonRaceCount(season: number): Promise<number> {
    const res = await this.cache.get<RacesResponse>(`${BASE_URL}/${season}/races/?limit=1`);
    return Number(res.MRData.total) || 0;
  }

  /**
   * Abbina un pilota OpenF1 al suo driverId Jolpica: si cerca dalla stagione corrente
   * all'indietro fino al 2023, prima per sigla e poi per cognome; null se non c'è
   */
  async findDriver(acronym: string, fullName: string): Promise<JolpicaDriverMatch | null> {
    const code = acronym.toUpperCase();
    const name = words(fullName);
    for (let season = new Date().getFullYear(); season >= FIRST_OPENF1_SEASON; season--) {
      const drivers = await this.getSeasonDrivers(season);
      const found = drivers.find(d => d.code === code) ?? drivers.find(d => name.includes(words(d.familyName)));
      if (found) return { driverId: found.driverId, nationality: found.nationality, wikiTitle: wikiTitleFromUrl(found.url) };
    }
    return null;
  }

  // Elenco piloti di una stagione; una stagione che Jolpica non conosce (404) è vuota
  private async getSeasonDrivers(season: number): Promise<JolpicaDriver[]> {
    try {
      const res = await this.cache.get<DriversResponse>(`${BASE_URL}/${season}/drivers/?limit=${PAGE_SIZE}`);
      return res.MRData.DriverTable.Drivers;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return [];
      throw err;
    }
  }

  /** Anagrafica di un pilota; null se Jolpica non lo conosce */
  async getDriver(driverId: string): Promise<JolpicaDriverInfo | null> {
    try {
      const res = await this.cache.get<DriversResponse>(`${BASE_URL}/drivers/${driverId}/`);
      const driver = res.MRData.DriverTable.Drivers[0];
      return driver ? toDriverInfo(driver) : null;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      throw err;
    }
  }

  /** Tutti i piloti della storia della F1 (881 nel 2026, 9 pagine) */
  async getAllDrivers(): Promise<JolpicaDriverInfo[]> {
    const pages = await this.getAllPages<DriversResponse>(offset => `${BASE_URL}/drivers/?limit=${PAGE_SIZE}&offset=${offset}`);
    return pages.flatMap(p => p.MRData.DriverTable.Drivers).map(toDriverInfo);
  }

  /** Numeri di carriera: ogni valore è il MRData.total di una richiesta con limit=1 */
  async getCareerTotals(driverId: string): Promise<CareerTotals> {
    const base = `${BASE_URL}/drivers/${driverId}`;
    const [all, first, second, third, poles, fastest] = await Promise.all(
      ['results/', 'results/1/', 'results/2/', 'results/3/', 'qualifying/1/', 'fastest/1/results/']
        .map(path => this.cache.get<RacesResponse>(`${base}/${path}?limit=1`)));
    const total = (res: RacesResponse) => Number(res.MRData.total) || 0;
    // la prima gara restituita è l'esordio
    const debut = all.MRData.RaceTable.Races[0];
    return {
      races: total(all),
      wins: total(first),
      podiums: total(first) + total(second) + total(third),
      poles: total(poles),
      fastestLaps: total(fastest),
      debut: debut ? { season: Number(debut.season), raceName: debut.raceName } : undefined
    };
  }

  /** Stagioni corse dal pilota, dalla più recente */
  async getDriverSeasons(driverId: string): Promise<number[]> {
    const res = await this.cache.get<SeasonsResponse>(`${BASE_URL}/drivers/${driverId}/seasons/?limit=${PAGE_SIZE}`);
    return res.MRData.SeasonTable.Seasons.map(s => Number(s.season)).sort((a, b) => b - a);
  }

  /** Vuota per le stagioni prima del 1958, quando il campionato costruttori non esisteva */
  async getConstructorStandings(season: number): Promise<ConstructorStanding[]> {
    const res = await this.cache.get<StandingsResponse<JolpicaConstructorRow>>(`${BASE_URL}/${season}/constructorstandings/?limit=${PAGE_SIZE}`);
    const rows = res.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
    return rows.map((row, i) => ({
      position: toPosition(row.position, i),
      points: Number(row.points),
      wins: Number(row.wins),
      constructorId: row.Constructor.constructorId,
      name: row.Constructor.name,
      nationality: row.Constructor.nationality
    }));
  }
}
