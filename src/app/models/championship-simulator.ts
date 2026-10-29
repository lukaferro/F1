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
  // Posizioni gara: array di ID contendente per ciascuna posizione a punti (0 = P1, 1 = P2, ...)
  racePositions?: (string | undefined)[];
  // Posizioni Sprint: array di ID contendente per ciascuna posizione a punti della Sprint (0 = P1 Sprint, ...)
  sprintPositions?: (string | undefined)[];
  // Pilota autore del giro veloce
  fastestLapDriverId?: string;
  // Contendenti con esito 0 punti / ritirati in questo round (DNF / Fuori punti)
  dnfContenderIds?: string[];

  // Proprietà di compatibilità diretta
  raceWinnerId?: string;
  raceSecondId?: string;
  raceThirdId?: string;
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
  magicNumber: number | null; // quanti punti mancano al leader per la certezza matematica del titolo
  champion: SimulatorContender | null;
  contendersInContentionCount: number;
  standings: SimulatorContender[];
  nextRoundClinchScenario?: string | null;
}
