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
    expect(rules2025.racePoints.length).toBe(10);
    expect(rules2025.sprintPoints.length).toBe(8);
    expect(maxRoundPoints(false, 'drivers', 2025)).toBe(25);

    // 2019-2024: punto giro veloce attivo con vincolo Top 10
    const rules2024 = getSeasonScoringRules(2024);
    expect(rules2024.fastestLap).toBe(1);
    expect(rules2024.hasFastestLapPoint).toBe(true);
    expect(rules2024.fastestLapRequiresTop10).toBe(true);
    expect(maxRoundPoints(false, 'drivers', 2024)).toBe(26);

    // 2003-2009: 10 pt vittoria, primi 8, no FL
    const rules2008 = getSeasonScoringRules(2008);
    expect(rules2008.p1).toBe(10);
    expect(rules2008.p2).toBe(8);
    expect(rules2008.racePoints.length).toBe(8);
    expect(rules2008.fastestLap).toBe(0);
    expect(rules2008.hasFastestLapPoint).toBe(false);
    expect(maxRoundPoints(false, 'drivers', 2008)).toBe(10);

    // 1991-2002: primi 6 (10-6-4-3-2-1)
    const rules1998 = getSeasonScoringRules(1998);
    expect(rules1998.racePoints).toEqual([10, 6, 4, 3, 2, 1]);
  });

  it('determines the champion when gap is insurmountable', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 350, currentWins: 8 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 280, currentWins: 3 }
    ];

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

  it('rewrites history when a completed past round is modified (What If)', () => {
    const contenders = [
      { id: 'max_verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '#3671c6', currentPoints: 395.5, currentWins: 10 },
      { id: 'hamilton', name: 'Lewis Hamilton', constructorId: 'mercedes', constructorName: 'Mercedes', color: '#27f4d2', currentPoints: 387.5, currentWins: 8 }
    ];

    // Abu Dhabi 2021 (gara già completata ma modificata dall'utente: Hamilton 1°, Verstappen 2°)
    const rounds: SimulatorRaceRound[] = [
      {
        round: 22,
        raceName: 'Abu Dhabi GP',
        circuitId: 'yas_marina',
        circuitName: 'Yas Marina',
        locality: 'Abu Dhabi',
        country: 'UAE',
        date: '2021-12-12',
        hasSprint: false,
        isCompleted: true,
        isModified: true,
        realDriverPoints: { max_verstappen: 26, hamilton: 18 },
        realRaceOrder: ['max_verstappen', 'hamilton'],
        raceWinnerId: 'hamilton',
        raceSecondId: 'max_verstappen',
        racePositions: ['hamilton', 'max_verstappen'],
        fastestLapDriverId: 'max_verstappen'
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2021);

    expect(result.isHistoryRewritten).toBe(true);
    expect(result.modifiedRoundsCount).toBe(1);
    expect(result.champion?.id).toBe('hamilton');
    expect(result.originalChampion?.id).toBe('max_verstappen');
    // Hamilton guadagna +7 pt netti (25 - 18 = +7 -> 394.5), Verstappen perde -7 pt netti (19 - 26 = -7 -> 388.5)
    expect(result.standings[0].id).toBe('hamilton');
    expect(result.standings[0].totalPoints).toBe(394.5);
    expect(result.standings[1].id).toBe('max_verstappen');
    expect(result.standings[1].totalPoints).toBe(388.5);
  });

  it('handles DNF / zero points simulation and prevents unclaimed points', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 300, currentWins: 7 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 280, currentWins: 4 }
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
        dnfContenderIds: ['verstappen']
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    const champ = result.champion;
    expect(champ?.id).toBe('norris');
    expect(result.standings[0].id).toBe('norris');
    expect(result.standings[0].totalPoints).toBe(305);
    expect(result.standings[1].id).toBe('verstappen');
    expect(result.standings[1].totalPoints).toBe(300);
    expect(result.standings[1].maxPossiblePoints).toBe(300);
  });

  it('awards points beyond top 3 (P4 to P10) correctly', () => {
    const contenders = [
      { id: 'leclerc', name: 'Charles Leclerc', constructorId: 'ferrari', constructorName: 'Ferrari', color: 'e8002d', currentPoints: 100, currentWins: 2 },
      { id: 'sainz', name: 'Carlos Sainz', constructorId: 'ferrari', constructorName: 'Ferrari', color: 'e8002d', currentPoints: 80, currentWins: 1 }
    ];

    const rounds: SimulatorRaceRound[] = [
      {
        round: 1,
        raceName: 'Bahrain GP',
        circuitId: 'bahrain',
        circuitName: 'Sakhir',
        locality: 'Sakhir',
        country: 'Bahrain',
        date: '2024-03-02',
        hasSprint: false,
        isCompleted: false,
        racePositions: [undefined, undefined, undefined, 'leclerc', 'sainz']
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);
    const leclerc = result.standings.find(s => s.id === 'leclerc')!;
    const sainz = result.standings.find(s => s.id === 'sainz')!;

    expect(leclerc.simulatedPoints).toBe(12);
    expect(leclerc.totalPoints).toBe(112);
    expect(sainz.simulatedPoints).toBe(10);
    expect(sainz.totalPoints).toBe(90);
  });

  it('enforces fastest lap top 10 condition for 2019-2024', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 100, currentWins: 2 },
      { id: 'albon', name: 'Alex Albon', constructorId: 'williams', constructorName: 'Williams', color: '00a0dd', currentPoints: 10, currentWins: 0 }
    ];

    const rounds: SimulatorRaceRound[] = [
      {
        round: 1,
        raceName: 'Italian GP',
        circuitId: 'monza',
        circuitName: 'Monza',
        locality: 'Monza',
        country: 'Italy',
        date: '2024-09-01',
        hasSprint: false,
        isCompleted: false,
        raceWinnerId: 'verstappen',
        fastestLapDriverId: 'albon',
        racePositions: ['verstappen', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'albon']
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);
    const albon = result.standings.find(s => s.id === 'albon')!;
    expect(albon.simulatedPoints).toBe(0);
    expect(albon.totalPoints).toBe(10);
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
        fastestLapDriverId: 'leclerc'
      }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2026);
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
    expect(result.magicNumber).toBeDefined();
    expect(result.nextRoundClinchScenario).toContain('Qatar GP');
  });
});
