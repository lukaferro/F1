import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpCache } from './http-cache';

// Jolpica: archivio storico della F1 dal 1950 (erede di Ergast). https://github.com/jolpica/jolpica-f1
const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const PAGE_SIZE = 100; // massimo consentito dall'API per richiesta

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
interface JolpicaDriverRow {
  position?: string; points: string; wins: string;
  Driver: { driverId: string; code?: string; givenName: string; familyName: string; nationality: string };
  Constructors: JolpicaConstructor[];
}
interface JolpicaConstructorRow { position?: string; points: string; wins: string; Constructor: JolpicaConstructor; }
interface StandingsResponse<Row> {
  MRData: {
    total: string;
    StandingsTable: { season: string; StandingsLists: Array<{ DriverStandings?: Row[]; ConstructorStandings?: Row[] }> };
  };
}
interface SeasonsResponse { MRData: { total?: string; SeasonTable: { Seasons: Array<{ season: string }> } }; }

/** Le stagioni concluse non cambiano più (7 giorni); stagione in corso ed elenchi generali 1 ora */
export function jolpicaTtl(url: string, currentYear: number): number {
  const season = Number(url.match(/\/f1\/(\d{4})\//)?.[1]);
  return season && season < currentYear ? 604_800_000 : 3_600_000;
}

const toPosition = (value: string | undefined, index: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : index + 1;
};

@Injectable({ providedIn: 'root' })
export class JolpicaService {
  // Limiti Jolpica per indirizzo IP: 4 richieste al secondo e 500 all'ora
  private readonly cache = new HttpCache(inject(HttpClient), {
    prefix: 'jolpica:',
    minGapMs: 260,
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
        constructorName: team?.name ?? ''
      };
    });
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
