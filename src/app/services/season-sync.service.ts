import { inject, Injectable } from '@angular/core';
import { JolpicaService, DriverStanding, ConstructorStanding, SeasonScheduleItem } from './jolpica.service';
import { Openf1ServiceService, Driver } from './openf1-service';
import { CircuitsService } from './circuits.service';
import { MediaPipelineService } from './media-pipeline.service';
import { Meeting } from '../models/meeting';

export interface SeasonRosterItem {
  driverId: string;
  code?: string;
  fullName: string;
  nationality: string;
  constructorId: string;
  constructorName: string;
  position: number;
  points: number;
  wins: number;
  teamColor: string;
  photoUrl?: string;
  photoFallbackChain: string[];
}

export interface SeasonRoster {
  season: number;
  drivers: SeasonRosterItem[];
  constructors: ConstructorStanding[];
  schedule: SeasonScheduleItem[];
}

const CACHE_SEASON_KEY = 'f1:active-season';

@Injectable({
  providedIn: 'root'
})
export class SeasonSyncService {
  private readonly jolpica: JolpicaService | null;
  private readonly openF1: Openf1ServiceService | null;
  private readonly circuitsService: CircuitsService | null;
  private readonly mediaPipeline: MediaPipelineService | null;

  constructor(
    jolpica?: JolpicaService | null,
    openF1?: Openf1ServiceService | null,
    circuitsService?: CircuitsService | null,
    mediaPipeline?: MediaPipelineService | null
  ) {
    this.jolpica = jolpica !== undefined ? jolpica : inject(JolpicaService, { optional: true });
    this.openF1 = openF1 !== undefined ? openF1 : inject(Openf1ServiceService, { optional: true });
    this.circuitsService = circuitsService !== undefined ? circuitsService : inject(CircuitsService, { optional: true });
    this.mediaPipeline = mediaPipeline !== undefined ? mediaPipeline : inject(MediaPipelineService, { optional: true });
  }

  private cachedActiveSeason: number | null = null;

  /**
   * Rilevamento automatico della stagione attiva:
   * Verifica se l'anno solare corrente ha tappe o classifiche configurate su OpenF1 o Jolpica.
   * Se siamo all'inizio dell'anno (pre-stagione) rileva se la nuova stagione è aperta o se
   * l'ultima con dati ufficiali è quella precedente.
   */
  async detectActiveSeason(): Promise<number> {
    if (this.cachedActiveSeason !== null) {
      return this.cachedActiveSeason;
    }

    try {
      const stored = localStorage.getItem(CACHE_SEASON_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > 1950) {
          this.cachedActiveSeason = parsed;
        }
      }
    } catch {
      // ignore localStorage
    }

    const currentYear = new Date().getFullYear();

    try {
      // 1. Prova a verificare se OpenF1 ha meeting per l'anno in corso
      const currentMeetings = await this.openF1.getMeetings(currentYear);
      if (Array.isArray(currentMeetings) && currentMeetings.length > 0) {
        this.setActiveSeason(currentYear);
        return currentYear;
      }
    } catch {
      // fallback Jolpica
    }

    try {
      // 2. Prova a verificare il calendario Jolpica dell'anno in corso
      const schedule = await this.jolpica.getSeasonSchedule(currentYear);
      if (Array.isArray(schedule) && schedule.length > 0) {
        this.setActiveSeason(currentYear);
        return currentYear;
      }
    } catch {
      // fallback
    }

    try {
      // 3. Fallback sull'ultima stagione disponibile con classifiche
      const latest = await this.jolpica.getLatestSeasonWithStandings();
      if (latest) {
        this.setActiveSeason(latest);
        return latest;
      }
    } catch {
      // default
    }

    this.setActiveSeason(currentYear);
    return currentYear;
  }

  private setActiveSeason(season: number): void {
    this.cachedActiveSeason = season;
    try {
      localStorage.setItem(CACHE_SEASON_KEY, String(season));
    } catch {
      // ignore
    }
  }

  /**
   * Sincronizzazione dinamica automatica del calendario e delle tappe per la stagione attiva:
   * Configura automaticamente round, orari, date e tracciati su CircuitsService
   * e avvia la pipeline in background per i giri record.
   */
  async syncActiveSeasonCalendar(targetSeason?: number): Promise<{ season: number; roundsCount: number; meetings: Meeting[] }> {
    const season = targetSeason ?? await this.detectActiveSeason();

    let meetings: Meeting[] = [];
    try {
      const resp = await this.openF1.getMeetings(season);
      if (Array.isArray(resp) && resp.length > 0) {
        meetings = resp.filter(m => !m.meeting_name?.toLowerCase().includes('testing'));
        this.circuitsService.applyMeetings(meetings);
      }
    } catch {
      // fallback su Jolpica
    }

    if (meetings.length === 0) {
      try {
        const schedule = await this.jolpica.getSeasonSchedule(season);
        if (schedule && schedule.length > 0) {
          this.circuitsService.applySeasonRaces(schedule);
          // Avvia sync fastest lap records
          void this.circuitsService.syncFastestLapRecords(season);
          return { season, roundsCount: schedule.length, meetings: [] };
        }
      } catch {
        // fallback
      }
    }

    // Avvia sync fastest lap records in background
    void this.circuitsService.syncFastestLapRecords(season);

    const roundsCount = this.circuitsService.getSeasonCalendar().length;
    return { season, roundsCount, meetings };
  }

  /**
   * Sincronizzazione dinamica classifiche, posizioni e roster ufficiale della stagione:
   * Popola istantaneamente classifiche piloti e costruttori, punti, vittorie,
   * abbinamenti pilota-scuderia ufficiali e pipeline immagini.
   */
  async getSeasonRoster(season: number): Promise<SeasonRoster> {
    const [driverStandings, constructorStandings, schedule] = await Promise.all([
      this.jolpica.getDriverStandings(season).catch(() => [] as DriverStanding[]),
      this.jolpica.getConstructorStandings(season).catch(() => [] as ConstructorStanding[]),
      this.jolpica.getSeasonSchedule(season).catch(() => [] as SeasonScheduleItem[])
    ]);

    // Recupera i piloti attivi da OpenF1 se stagione recente
    let openF1Drivers: Driver[] = [];
    try {
      if (season >= 2023) {
        openF1Drivers = await this.openF1.getDrivers();
      }
    } catch {
      // fallback
    }

    const openF1Map = new Map<string, Driver>();
    for (const d of openF1Drivers) {
      if (d.name_acronym) openF1Map.set(d.name_acronym.toUpperCase(), d);
    }

    const rosterDrivers: SeasonRosterItem[] = driverStandings.map(d => {
      const acronym = d.code?.toUpperCase();
      const openF1Driver = acronym ? openF1Map.get(acronym) : undefined;
      const teamColor = openF1Driver?.team_color || 'e10600';

      const photoChain = this.mediaPipeline.getDriverPhotoChain({
        driverId: d.driverId,
        fullName: d.fullName,
        code: d.code,
        name_acronym: d.code,
        team_name: d.constructorName || openF1Driver?.team_name,
        headshot_url: openF1Driver?.headshot_url,
        wikiTitle: d.wikiTitle,
        team_color: teamColor
      }, season);

      return {
        driverId: d.driverId,
        code: d.code,
        fullName: d.fullName,
        nationality: d.nationality,
        constructorId: d.constructorId,
        constructorName: d.constructorName,
        position: d.position,
        points: d.points,
        wins: d.wins,
        teamColor,
        photoUrl: photoChain[0],
        photoFallbackChain: photoChain
      };
    });

    return {
      season,
      drivers: rosterDrivers,
      constructors: constructorStandings,
      schedule
    };
  }
}
