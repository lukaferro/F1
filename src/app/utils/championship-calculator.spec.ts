import { describe, expect, it } from 'vitest';
import { calculateChampionship, maxRoundPoints } from './championship-calculator';
import { SimulatorRaceRound } from '../models/championship-simulator';

describe('championship-calculator', () => {
  it('calculates maximum round points correctly', () => {
    expect(maxRoundPoints(false, 'drivers')).toBe(26); // 25 + 1
    expect(maxRoundPoints(true, 'drivers')).toBe(34); // 25 + 1 + 8
    expect(maxRoundPoints(false, 'constructors')).toBe(44); // 25 + 18 + 1
    expect(maxRoundPoints(true, 'constructors')).toBe(59); // 44 + 15
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

    // Gap = 70 pt, Max punti rimanenti per Norris = 52 pt -> Verstappen è campione matematico!
    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    expect(result.champion?.id).toBe('verstappen');
    expect(result.champion?.isChampion).toBe(true);
    expect(result.contendersInContentionCount).toBe(1);
    expect(result.magicNumber).toBeNull();
  });

  it('calculates the magic number and next round scenario when title is open', () => {
    const contenders = [
      { id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', constructorName: 'Red Bull', color: '3671c6', currentPoints: 300, currentWins: 7 },
      { id: 'norris', name: 'Lando Norris', constructorId: 'mclaren', constructorName: 'McLaren', color: 'ff8000', currentPoints: 270, currentWins: 3 }
    ];

    // Gap = 30 pt. Rimangono 2 gare (Qatar con sprint = 34 pt, Abu Dhabi = 26 pt -> totale 60 pt)
    const rounds: SimulatorRaceRound[] = [
      { round: 23, raceName: 'Qatar GP', circuitId: 'losail', circuitName: 'Lusail', locality: 'Lusail', country: 'Qatar', date: '2024-12-01', hasSprint: true, isCompleted: false },
      { round: 24, raceName: 'Abu Dhabi GP', circuitId: 'yas_marina', circuitName: 'Yas Marina', locality: 'Abu Dhabi', country: 'UAE', date: '2024-12-08', hasSprint: false, isCompleted: false }
    ];

    const result = calculateChampionship(contenders, rounds, 'drivers', 2024);

    expect(result.champion).toBeNull();
    expect(result.contendersInContentionCount).toBe(2);
    // Norris maxPoints = 270 + 60 = 330. Leader = 300. Magic number = 330 - 300 + 1 = 31 pt.
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

    // Norris: 290 + 25 = 315 pt, 4 vittorie
    // Verstappen: 300 + 18 = 318 pt, 7 vittorie
    const leader = result.standings[0];
    const second = result.standings[1];

    expect(leader.id).toBe('verstappen');
    expect(leader.totalPoints).toBe(318);
    expect(second.id).toBe('norris');
    expect(second.totalPoints).toBe(315);
    expect(result.champion?.id).toBe('verstappen');
  });
});
