export interface SimulatorRaceRound {
  round: number;
  raceName: string;
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  date: string;
  hasSprint: boolean;
  isCompleted: boolean;
  // Esito simulato per questo round
  raceWinnerId?: string;
  raceSecondId?: string;
  raceThirdId?: string;
  fastestLapDriverId?: string;
  sprintWinnerId?: string;
}

export interface SimulatorContender {
  id: string;
  name: string;
  code?: string;
  constructorId: string;
  constructorName: string;
  color: string;
  currentPoints: number;
  currentWins: number;
  simulatedPoints: number;
  simulatedWins: number;
  totalPoints: number;
  totalWins: number;
  maxPossiblePoints: number;
  isChampion: boolean;
  isEliminated: boolean;
  gapToLeader: number;
  position: number;
}

export interface ChampionshipSimulationResult {
  mode: 'drivers' | 'constructors';
  season: number;
  totalRounds: number;
  remainingRoundsCount: number;
  remainingPointsOnTable: number;
  magicNumber: number | null; // quanti punti mancano al leader per essere incoronato
  champion: SimulatorContender | null;
  contendersInContentionCount: number;
  standings: SimulatorContender[];
  nextRoundClinchScenario?: string | null;
}
