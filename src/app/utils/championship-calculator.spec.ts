import { describe, expect, it } from 'vitest';
import { calculateChampionship, maxRoundPoints, getSeasonScoringRules } from './championship-calculator';
import { SimulatorRaceRound } from '../models/championship-simulator';

describe('championship-calculator', () => {
  it('adapts scoring rules across different eras', () => {
    // 2025+: punto giro veloce abolito dalla FIA!
    const rules2025 = getSeasonScoringRules(2025);
    expect(rules2025.p1).toBe(25);
    expect(rules2025.fastestLap).toBe(0);
    expect(rules2025.hasFastestLapPoint).toBe(false);
    expect(rules2025.hasSprint).toBe(true);
    expect(maxRoundPoints(false, 'drivers', 2025)).toBe(25); // solo 25, no FL!

    // 2019-2024: punto giro veloce attivo
    const rules2024 = getSeasonScoringRules(2024);
    expect(rules2024.fastestLap).toBe(1);
    expect(rules2024.hasFastestLapPoint).toBe(true);
    expect(maxRoundPoints(false, 'drivers', 2024)).toBe(26); // 25 + 1

    // 2003-2009: 10 pt vittoria, no FL
    const rules2008 = getSeasonScoringRules(2008);
    expect(rules2008.p1).toBe(10);
    expect(rules2008.p2).toBe(8);
    expect(rules2008.fastestLap).toBe(0);
    expect(rules2008.hasFastestLapPoint).toBe(false);
    expect(maxRoundPoints(false, 'drivers', 2008)).toBe(10);
  });

  it('determines the champion when gap is insurmountable', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 350, currentWins: 8 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 280, currentWins: 3 }
    ];

    // Restano 2 gare normali (max 26 pt ciascuna = 52 pt)
    const rounds: SimulatorRaceRound[] = [
      { round: 23, raceName: 'Qatar GP', circuitId: 'losail', circuitName: 'Lusail', locality: 'Lusail', country: 'Qatar', date: '2024-12-01', hasSprint: false, isCompleted: false },
      { round: 24, raceName: 'Abu Dhabi GP', circuitId: 'yas_marina', circuitName: 'Yas Marina', locality: 'Abu Dhabi', country: 'UAE', date: '2024-12-08', hasSprint: false, isCompleted: false }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    expect(result.champion?.id).toBe('verstappen');
    expect(result.champion?.isChampion).toBe(true);
    expect(result.contendersInContentionCount).toBe(1);
    expect(result.magicNumber).toBeNull();
  });

  it('does not assign fastest lap points in 2025 and 2026 seasons', () => {
    const contenders = [
      { id: 'leclerc', name: 'Charles Leclerc', constructorId: 'ferrari', constructorName: 'Ferrari', color: 'e8002d', currentPoints: 100, currentWins: 2 }
    ];

    const rounds: SimulatorRaceRound[] = [
      {
        round: 1,
        raceName: 'Australian GP',
        circuitId: 'albert_park',
        circuitName: 'Albert Park',
        locality: 'Melbourne',
        country: 'Australia',
        date: '2026-03-15',
        hasSprint: false,
        isCompleted: false,
        raceWinnerId: 'leclerc',
        fastestLapDriverId: 'leclerc' // assegnato, ma nel 2026 non dà punti!
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2026);
    // 100 base + 25 vittoria = 125 pt (0 punti per il giro veloce)
    expect(result.standings[0].totalPoints).toBe(125);
    expect(result.standings[0].simulatedPoints).toBe(25);
  });

  it('calculates the magic number and next round scenario when title is open', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 300, currentWins: 7 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 270, currentWins: 3 }
    ];

    const rounds: SimulatorRaceRound[] = [
      { round: 23, raceName: 'Qatar GP', circuitId: 'losail', circuitName: 'Lusail', locality: 'Lusail', country: 'Qatar', date: '2024-12-01', hasSprint: true, isCompleted: false },
      { round: 24, raceName: 'Abu Dhabi GP', circuitId: 'yas_marina', circuitName: 'Yas Marina', locality: 'Abu Dhabi', country: 'UAE', date: '2024-12-08', hasSprint: false, isCompleted: false }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    expect(result.champion).toBeNull();
    expect(result.contendersInContentionCount).toBe(2);
    expect(result.magicNumber).toBe(31);
    expect(result.nextRoundClinchScenario).toContain('Qatar GP');
  });

  it('updates standings when a simulated race winner is assigned', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 300, currentWins: 7 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 290, currentWins: 3 }
    ];

    const rounds: SimulatorRaceRound[] = [
      {
        round: 24,
        raceName: 'Abu Dhabi GP',
        circuitId: 'yas_marina',
        circuitName: 'Yas Marina',
        locality: 'Abu Dhabi',
        country: 'UAE',
        date: '2024-12-08',
        hasSprint: false,
        isCompleted: false,
        raceWinnerId: 'norris',
        raceSecondId: 'verstappen'
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    const leader = result.standings[0];
    const second = result.standings[1];

    expect(leader.id).toBe('verstappen');
    expect(leader.totalPoints).toBe(318);
    expect(second.id).toBe('norris');
    expect(second.totalPoints).toBe(315);
    expect(result.champion?.id).toBe('verstappen');
  });
});
