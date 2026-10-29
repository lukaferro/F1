import { describe, expect, it } from 'vitest';
import {
  calculateFutureScenario,
  calculateHistoricalWhatIf,
  FAMOUS_HISTORICAL_PIVOTS
} from './what-if-scenarios';
import { DriverStanding, SeasonScheduleItem } from '../services/jolpica.service';

describe('what-if-scenarios', () => {
  const dummySchedule: SeasonScheduleItem[] = [
    { round: 1, raceName: 'Bahrain GP', circuitId: 'bahrain', circuitName: 'Sakhir', locality: 'Sakhir', country: 'Bahrain', date: '2024-03-02', hasSprint: false },
    { round: 2, raceName: 'Saudi Arabian GP', circuitId: 'jeddah', circuitName: 'Jeddah', locality: 'Jeddah', country: 'Saudi Arabia', date: '2024-03-09', hasSprint: false },
    { round: 3, raceName: 'Qatar GP', circuitId: 'losail', circuitName: 'Lusail', locality: 'Lusail', country: 'Qatar', date: '2029-12-01', hasSprint: false },
    { round: 4, raceName: 'Abu Dhabi GP', circuitId: 'yas_marina', circuitName: 'Yas Marina', locality: 'Abu Dhabi', country: 'UAE', date: '2029-12-08', hasSprint: false }
  ];

  const dummyStandings: DriverStanding[] = [
    { position: 1, points: 50, wins: 2, driverId: 'max_verstappen', code: 'VER', permanentNumber: '1', givenName: 'Max', familyName: 'Verstappen', fullName: 'Max Verstappen', nationality: 'Dutch', dateOfBirth: '1997-09-30', constructorId: 'red_bull', constructorName: 'Red Bull' },
    { position: 2, points: 36, wins: 0, driverId: 'norris', code: 'NOR', permanentNumber: '4', givenName: 'Lando', familyName: 'Norris', fullName: 'Lando Norris', nationality: 'British', dateOfBirth: '1999-11-13', constructorId: 'mclaren', constructorName: 'McLaren' }
  ];

  it('calculates future scenario for leader dominance', () => {
    const outcome = calculateFutureScenario(dummySchedule, dummyStandings, 2024, 'leader-dominance');
    expect(outcome.mode).toBe('future-projections');
    expect(outcome.winnerName).toBe('Max Verstappen');
    expect(outcome.winnerPoints).toBeGreaterThan(50);
    expect(outcome.gap).toBeGreaterThan(0);
    expect(outcome.series.length).toBe(2);
  });

  it('calculates future scenario for chaser comeback', () => {
    const outcome = calculateFutureScenario(dummySchedule, dummyStandings, 2024, 'chaser-comeback');
    expect(outcome.mode).toBe('future-projections');
    expect(outcome.series[1].projectedTotalPoints).toBeGreaterThan(36);
  });

  it('calculates historical what if for 2008 Singapore', () => {
    const pivot2008 = FAMOUS_HISTORICAL_PIVOTS.find(p => p.id === '2008-singapore');
    expect(pivot2008).toBeDefined();

    const standings2008: DriverStanding[] = [
      { position: 1, points: 98, wins: 5, driverId: 'hamilton', code: 'HAM', permanentNumber: '22', givenName: 'Lewis', familyName: 'Hamilton', fullName: 'Lewis Hamilton', nationality: 'British', dateOfBirth: '1985-01-07', constructorId: 'mclaren', constructorName: 'McLaren' },
      { position: 2, points: 97, wins: 6, driverId: 'massa', code: 'MAS', permanentNumber: '2', givenName: 'Felipe', familyName: 'Massa', fullName: 'Felipe Massa', nationality: 'Brazilian', dateOfBirth: '1981-04-25', constructorId: 'ferrari', constructorName: 'Ferrari' }
    ];

    const schedule2008: SeasonScheduleItem[] = [
      { round: 15, raceName: 'Singapore GP', circuitId: 'marina_bay', circuitName: 'Marina Bay', locality: 'Singapore', country: 'Singapore', date: '2008-09-28', hasSprint: false },
      { round: 18, raceName: 'Brazilian GP', circuitId: 'interlagos', circuitName: 'Interlagos', locality: 'Sao Paulo', country: 'Brazil', date: '2008-11-02', hasSprint: false }
    ];

    const outcome = calculateHistoricalWhatIf(schedule2008, standings2008, 2008, pivot2008!);
    expect(outcome.mode).toBe('historical-what-if');
    expect(outcome.winnerName).toBe('Felipe Massa');
    expect(outcome.isHistoryChanged).toBe(true);
    expect(outcome.summary).toContain('Felipe Massa');
  });
});
