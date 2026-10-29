import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeasonSyncService } from './season-sync.service';

describe('SeasonSyncService', () => {
  let service: SeasonSyncService;
  let jolpicaMock: any;
  let openF1Mock: any;
  let circuitsServiceMock: any;
  let mediaPipelineMock: any;

  beforeEach(() => {
    localStorage.clear();
    jolpicaMock = {
      getSeasonSchedule: vi.fn(),
      getLatestSeasonWithStandings: vi.fn(),
      getDriverStandings: vi.fn(),
      getConstructorStandings: vi.fn()
    };
    openF1Mock = {
      getMeetings: vi.fn(),
      getDrivers: vi.fn()
    };
    circuitsServiceMock = {
      applyMeetings: vi.fn(),
      applySeasonRaces: vi.fn(),
      getSeasonCalendar: vi.fn().mockReturnValue([{}, {}, {}]),
      syncFastestLapRecords: vi.fn().mockResolvedValue({ updatedCount: 0 })
    };
    mediaPipelineMock = {
      getDriverPhotoChain: vi.fn().mockReturnValue(['https://cdn.url/photo.webp', 'data:image/svg+xml;utf8,...'])
    };

    service = new SeasonSyncService(
      jolpicaMock,
      openF1Mock,
      circuitsServiceMock,
      mediaPipelineMock
    );
  });

  describe('detectActiveSeason', () => {
    it('detects current year when OpenF1 has meetings', async () => {
      const currentYear = new Date().getFullYear();
      openF1Mock.getMeetings.mockResolvedValue([
        { meeting_key: 1, meeting_name: 'Australian Grand Prix', year: currentYear }
      ]);

      const season = await service.detectActiveSeason();
      expect(season).toBe(currentYear);
    });

    it('falls back to Jolpica schedule when OpenF1 has no meetings', async () => {
      const currentYear = new Date().getFullYear();
      openF1Mock.getMeetings.mockResolvedValue([]);
      jolpicaMock.getSeasonSchedule.mockResolvedValue([
        { season: currentYear, round: 1, raceName: 'Australian GP' }
      ]);

      const season = await service.detectActiveSeason();
      expect(season).toBe(currentYear);
    });

    it('falls back to latest standings season when both have empty schedules', async () => {
      openF1Mock.getMeetings.mockResolvedValue([]);
      jolpicaMock.getSeasonSchedule.mockResolvedValue([]);
      jolpicaMock.getLatestSeasonWithStandings.mockResolvedValue(2025);

      const season = await service.detectActiveSeason();
      expect(season).toBe(2025);
    });
  });

  describe('syncActiveSeasonCalendar', () => {
    it('syncs meetings and triggers fastest laps pipeline', async () => {
      const mockMeetings = [
        { meeting_key: 1, meeting_name: 'Australian GP', date_start: '2026-03-15' }
      ];
      openF1Mock.getMeetings.mockResolvedValue(mockMeetings);

      const res = await service.syncActiveSeasonCalendar(2026);
      expect(res.season).toBe(2026);
      expect(circuitsServiceMock.applyMeetings).toHaveBeenCalledWith(mockMeetings);
      expect(circuitsServiceMock.syncFastestLapRecords).toHaveBeenCalledWith(2026);
    });
  });

  describe('getSeasonRoster', () => {
    it('populates standings, pairings and photo fallback chains', async () => {
      jolpicaMock.getDriverStandings.mockResolvedValue([
        {
          driverId: 'norris',
          code: 'NOR',
          fullName: 'Lando Norris',
          nationality: 'British',
          constructorId: 'mclaren',
          constructorName: 'McLaren',
          position: 1,
          points: 390,
          wins: 4
        }
      ]);
      jolpicaMock.getConstructorStandings.mockResolvedValue([
        { constructorId: 'mclaren', name: 'McLaren', position: 1, points: 666, wins: 6 }
      ]);
      jolpicaMock.getSeasonSchedule.mockResolvedValue([]);
      openF1Mock.getDrivers.mockResolvedValue([
        { name_acronym: 'NOR', team_color: 'ff8000', headshot_url: 'https://cdn/nor.png' }
      ]);

      const roster = await service.getSeasonRoster(2026);
      expect(roster.drivers.length).toBe(1);
      expect(roster.drivers[0].fullName).toBe('Lando Norris');
      expect(roster.drivers[0].teamColor).toBe('ff8000');
      expect(roster.drivers[0].photoFallbackChain.length).toBe(2);
      expect(roster.constructors.length).toBe(1);
    });
  });
});
