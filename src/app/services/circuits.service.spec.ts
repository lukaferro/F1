import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of } from 'rxjs';
import {
  CircuitsService,
  LAP_RECORDS_CACHE_KEY,
  isFasterLap,
  parseLapTimeToMillis
} from './circuits.service';

describe('CircuitsService - Fastest Laps Stale-While-Revalidate Pipeline', () => {
  let service: CircuitsService;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('parseLapTimeToMillis and isFasterLap', () => {
    it('converts mm:ss.sss format to milliseconds', () => {
      expect(parseLapTimeToMillis('1:22.091')).toBe(82091);
      expect(parseLapTimeToMillis('1:19.813')).toBe(79813);
      expect(parseLapTimeToMillis('1:30.734')).toBe(90734);
    });

    it('converts ss.sss format to milliseconds', () => {
      expect(parseLapTimeToMillis('79.813')).toBe(79813);
    });

    it('returns null for invalid strings', () => {
      expect(parseLapTimeToMillis('')).toBeNull();
      expect(parseLapTimeToMillis(undefined)).toBeNull();
      expect(parseLapTimeToMillis('invalid')).toBeNull();
    });

    it('correctly compares whether candidate lap is faster', () => {
      expect(isFasterLap('1:19.500', '1:19.813')).toBe(true);
      expect(isFasterLap('1:22.091', '1:19.813')).toBe(false);
      expect(isFasterLap('1:19.813', undefined)).toBe(true);
      expect(isFasterLap('invalid', '1:19.813')).toBe(false);
    });
  });

  describe('Stale-While-Revalidate initial load', () => {
    it('initializes circuits with baseline records when cache is empty', () => {
      service = new CircuitsService(null);
      const monza = service.getCircuitById('monza');
      expect(monza).toBeDefined();
      expect(monza?.lap_record?.driver).toBe('Rubens Barrichello');
      expect(monza?.lap_record?.year).toBe(2004);
    });

    it('loads previously cached lap records from localStorage at 0 ms startup', () => {
      const cached = {
        monza: {
          time: '1:20.500',
          driver: 'Pilota Record',
          year: 2026
        }
      };
      localStorage.setItem(LAP_RECORDS_CACHE_KEY, JSON.stringify(cached));

      service = new CircuitsService(null);
      const monza = service.getCircuitById('monza');
      expect(monza?.lap_record?.time).toBe('1:20.500');
      expect(monza?.lap_record?.driver).toBe('Pilota Record');
      expect(monza?.lap_record?.year).toBe(2026);
    });
  });

  describe('syncFastestLapRecords', () => {
    it('updates circuit record and emits event when a new record is discovered', async () => {
      service = new CircuitsService(null);
      const monzaBefore = service.getCircuitById('monza')!;
      const oldTime = monzaBefore.lap_record!.time; // '1:21.046'

      const mockJolpicaResponse = {
        MRData: {
          RaceTable: {
            Races: [
              {
                season: '2026',
                raceName: 'Italian Grand Prix',
                Circuit: { circuitId: 'monza', circuitName: 'Autodromo Nazionale Monza' },
                Results: [
                  {
                    Driver: { givenName: 'Andrea Kimi', familyName: 'Antonelli' },
                    FastestLap: {
                      rank: '1',
                      Time: { time: '1:20.123' } // faster than 1:21.046
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      // Mock http
      (service as any).http = {
        get: vi.fn().mockReturnValue(of(mockJolpicaResponse))
      };

      let emittedUpdates: any[] = [];
      service.recordsUpdated$.subscribe(u => {
        emittedUpdates = u;
      });

      const result = await service.syncFastestLapRecords(2026);

      expect(result.updatedCount).toBe(1);
      expect(result.updates[0].circuitId).toBe('monza');
      expect(result.updates[0].oldTime).toBe(oldTime);
      expect(result.updates[0].newTime).toBe('1:20.123');
      expect(result.updates[0].driver).toBe('Andrea Kimi Antonelli');

      // In-memory circuit updated
      const monzaAfter = service.getCircuitById('monza')!;
      expect(monzaAfter.lap_record?.time).toBe('1:20.123');
      expect(monzaAfter.lap_record?.driver).toBe('Andrea Kimi Antonelli');
      expect(monzaAfter.lap_record?.year).toBe(2026);

      // Emitted via Subject
      expect(emittedUpdates.length).toBe(1);

      // Persisted to localStorage
      const stored = JSON.parse(localStorage.getItem(LAP_RECORDS_CACHE_KEY)!);
      expect(stored.monza.time).toBe('1:20.123');
    });

    it('does not overwrite record if the session lap is slower than official track record', async () => {
      service = new CircuitsService(null);
      const melbourneBefore = service.getCircuitById('melbourne')!; // record: 1:19.813

      const mockJolpicaResponse = {
        MRData: {
          RaceTable: {
            Races: [
              {
                season: '2026',
                raceName: 'Australian Grand Prix',
                Circuit: { circuitId: 'albert_park' },
                Results: [
                  {
                    Driver: { givenName: 'Max', familyName: 'Verstappen' },
                    FastestLap: {
                      rank: '1',
                      Time: { time: '1:22.091' } // slower than 1:19.813
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      (service as any).http = {
        get: vi.fn().mockReturnValue(of(mockJolpicaResponse))
      };

      const result = await service.syncFastestLapRecords(2026);
      expect(result.updatedCount).toBe(0);
      expect(melbourneBefore.lap_record?.time).toBe('1:19.813');
    });
  });
});
