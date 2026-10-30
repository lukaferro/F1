import { describe, expect, it } from 'vitest';
import {
  assignDistinctSimulatorColors,
  buildSimulatorComparisonChart,
  calculateFutureScenario,
  calculateHistoricalWhatIf,
  FAMOUS_HISTORICAL_PIVOTS
} from './what-if-scenarios';
import { DriverStanding, SeasonScheduleItem } from '../services/jolpica.service';
import { SimulatorContender, SimulatorRaceRound } from '../models/championship-simulator';

describe('what-if-scenarios & comparison chart', () => {
  const dummySchedule: SeasonScheduleItem[] = [
    { season: 2024, round: 1, raceName: 'Bahrain GP', circuitId: 'bahrain', circuitName: 'Sakhir', locality: 'Sakhir', country: 'Bahrain', date: '2024-03-02', hasSprint: false },
    { season: 2024, round: 2, raceName: 'Saudi Arabian GP', circuitId: 'jeddah', circuitName: 'Jeddah', locality: 'Jeddah', country: 'Saudi Arabia', date: '2024-03-09', hasSprint: false },
    { season: 2024, round: 3, raceName: 'Qatar GP', circuitId: 'losail', circuitName: 'Lusail', locality: 'Lusail', country: 'Qatar', date: '2029-12-01', hasSprint: false },
    { season: 2024, round: 4, raceName: 'Abu Dhabi GP', circuitId: 'yas_marina', circuitName: 'Yas Marina', locality: 'Abu Dhabi', country: 'UAE', date: '2029-12-08', hasSprint: false }
  ];

  const dummyStandings: DriverStanding[] = [
    { position: 1, points: 50, wins: 2, driverId: 'max_verstappen', code: 'VER', fullName: 'Max Verstappen', nationality: 'Dutch', constructorId: 'red_bull', constructorName: 'Red Bull', constructors: [{ id: 'red_bull', name: 'Red Bull' }] },
    { position: 2, points: 36, wins: 0, driverId: 'norris', code: 'NOR', fullName: 'Lando Norris', nationality: 'British', constructorId: 'mclaren', constructorName: 'McLaren', constructors: [{ id: 'mclaren', name: 'McLaren' }] }
  ];

  it('assigns distinct high-contrast colors even to teammates on the same constructor', () => {
    const colorMap = assignDistinctSimulatorColors([
      { id: 'hamilton', constructorId: 'mercedes', constructorName: 'Mercedes', baseColor: '27f4d2' },
      { id: 'rosberg', constructorId: 'mercedes', constructorName: 'Mercedes', baseColor: '27f4d2' },
      { id: 'vettel', constructorId: 'ferrari', constructorName: 'Ferrari', baseColor: 'e8002d' }
    ], 'drivers');

    const hamColor = colorMap.get('hamilton')?.color;
    const rosColor = colorMap.get('rosberg')?.color;
    const vetColor = colorMap.get('vettel')?.color;

    expect(hamColor).toBeDefined();
    expect(rosColor).toBeDefined();
    expect(hamColor).not.toBe(rosColor);
    expect(vetColor).not.toBe(hamColor);
  });

  it('builds round-by-round comparison chart with real and simulated paths', () => {
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
        isCompleted: true,
        isModified: true,
        realDriverPoints: { max_verstappen: 25, norris: 18 },
        racePositions: ['norris', 'max_verstappen']
      }
    ];

    const contenders: SimulatorContender[] = [
      {
        id: 'norris',
        name: 'Lando Norris',
        constructorId: 'mclaren',
        constructorName: 'McLaren',
        color: '#FF8000',
        currentPoints: 18,
        currentWins: 0,
        simulatedPoints: 7,
        simulatedWins: 1,
        totalPoints: 25,
        totalWins: 1,
        position: 1,
        gapToLeader: 0,
        maxPossiblePoints: 25,
        isEliminated: false,
        isChampion: true
      }
    ];

    const driverToTeam = new Map<string, string>([
      ['norris', 'mclaren'],
      ['max_verstappen', 'red_bull']
    ]);
    const chart = buildSimulatorComparisonChart(rounds, contenders, 'drivers', 2024, driverToTeam);
    expect(chart).not.toBeNull();
    expect(chart!.rounds.length).toBe(1);
    expect(chart!.rounds[0].isModified).toBe(true);
    expect(chart!.series.length).toBe(1);
    expect(chart!.series[0].hasDiverged).toBe(true);
    expect(chart!.series[0].nodes[0].realCumulative).toBe(18);
    expect(chart!.series[0].nodes[0].simCumulative).toBe(25);
  });

  it('calculates future scenario for leader dominance', () => {
    const outcome = calculateFutureScenario(dummySchedule, dummyStandings, 2024, 'leader-dominance');
    expect(outcome.mode).toBe('future-projections');
    expect(outcome.winnerName).toBe('Max Verstappen');
    expect(outcome.winnerPoints).toBeGreaterThan(50);
    expect(outcome.gap).toBeGreaterThan(0);
    expect(outcome.series.length).toBe(2);
  });

  it('calculates historical what if for 2008 Singapore', () => {
    const pivot2008 = FAMOUS_HISTORICAL_PIVOTS.find(p => p.id === '2008-singapore');
    expect(pivot2008).toBeDefined();

    const standings2008: DriverStanding[] = [
      { position: 1, points: 98, wins: 5, driverId: 'hamilton', code: 'HAM', fullName: 'Lewis Hamilton', nationality: 'British', constructorId: 'mclaren', constructorName: 'McLaren', constructors: [{ id: 'mclaren', name: 'McLaren' }] },
      { position: 2, points: 97, wins: 6, driverId: 'massa', code: 'MAS', fullName: 'Felipe Massa', nationality: 'Brazilian', constructorId: 'ferrari', constructorName: 'Ferrari', constructors: [{ id: 'ferrari', name: 'Ferrari' }] }
    ];

    const schedule2008: SeasonScheduleItem[] = [
      { season: 2008, round: 15, raceName: 'Singapore GP', circuitId: 'marina_bay', circuitName: 'Marina Bay', locality: 'Singapore', country: 'Singapore', date: '2008-09-28', hasSprint: false },
      { season: 2008, round: 18, raceName: 'Brazilian GP', circuitId: 'interlagos', circuitName: 'Interlagos', locality: 'Sao Paulo', country: 'Brazil', date: '2008-11-02', hasSprint: false }
    ];

    const outcome = calculateHistoricalWhatIf(schedule2008, standings2008, 2008, pivot2008!);
    expect(outcome.mode).toBe('historical-what-if');
    expect(outcome.winnerName).toBe('Felipe Massa');
    expect(outcome.isHistoryChanged).toBe(true);
  });
});
