import {
  ChampionshipSimulationResult,
  SimulatorContender,
  SimulatorRaceRound
} from '../models/championship-simulator';

export const RACE_POINTS = {
  p1: 25,
  p2: 18,
  p3: 15,
  fastestLap: 1,
  sprintP1: 8
};

/**
 * Calcola i punti massimi teorici ancora disponibili per pilota o costruttore in un dato round
 */
export function maxRoundPoints(hasSprint: boolean, mode: 'drivers' | 'constructors'): number {
  if (mode === 'drivers') {
    // 25 vittoria + 1 giro veloce + 8 vittoria sprint
    return RACE_POINTS.p1 + RACE_POINTS.fastestLap + (hasSprint ? RACE_POINTS.sprintP1 : 0);
  } else {
    // 1° (25) + 2° (18) + FL (1) = 44 pt. Sprint: 1° (8) + 2° (7) = 15 pt
    return 44 + (hasSprint ? 15 : 0);
  }
}

/**
 * Ricalcola la classifica simulata e le combinazioni matematiche di titolo
 */
export function calculateChampionship(
  baseContenders: Array<{
    id: string;
    name: string;
    code?: string;
    constructorId: string;
    constructorName: string;
    color: string;
    currentPoints: number;
    currentWins: number;
  }>,
  rounds: SimulatorRaceRound[],
  mode: 'drivers' | 'constructors',
  season: number
): ChampionshipSimulationResult {
  const contenderMap = new Map<string, SimulatorContender>();

  for (const c of baseContenders) {
    contenderMap.set(c.id, {
      id: c.id,
      name: c.name,
      code: c.code,
      constructorId: c.constructorId,
      constructorName: c.constructorName,
      color: c.color,
      currentPoints: c.currentPoints,
      currentWins: c.currentWins,
      simulatedPoints: 0,
      simulatedWins: 0,
      totalPoints: c.currentPoints,
      totalWins: c.currentWins,
      maxPossiblePoints: c.currentPoints,
      isChampion: false,
      isEliminated: false,
      gapToLeader: 0,
      position: 1
    });
  }

  // Costruttori: mappiamo anche da constructorId se mode === 'constructors'
  // o per mappare i piloti alla scuderia
  const driverToConstructor = new Map<string, string>();
  for (const c of baseContenders) {
    driverToConstructor.set(c.id, c.constructorId);
  }

  const remainingRounds = rounds.filter(r => !r.isCompleted);
  let remainingPointsOnTable = 0;

  // Calcolo punti simulati round per round
  for (const r of remainingRounds) {
    const roundMax = maxRoundPoints(r.hasSprint, mode);
    remainingPointsOnTable += roundMax;

    if (mode === 'drivers') {
      if (r.raceWinnerId && contenderMap.has(r.raceWinnerId)) {
        const c = contenderMap.get(r.raceWinnerId)!;
        c.simulatedPoints += RACE_POINTS.p1;
        c.simulatedWins += 1;
      }
      if (r.raceSecondId && contenderMap.has(r.raceSecondId)) {
        const c = contenderMap.get(r.raceSecondId)!;
        c.simulatedPoints += RACE_POINTS.p2;
      }
      if (r.raceThirdId && contenderMap.has(r.raceThirdId)) {
        const c = contenderMap.get(r.raceThirdId)!;
        c.simulatedPoints += RACE_POINTS.p3;
      }
      if (r.fastestLapDriverId && contenderMap.has(r.fastestLapDriverId)) {
        const c = contenderMap.get(r.fastestLapDriverId)!;
        c.simulatedPoints += RACE_POINTS.fastestLap;
      }
      if (r.hasSprint && r.sprintWinnerId && contenderMap.has(r.sprintWinnerId)) {
        const c = contenderMap.get(r.sprintWinnerId)!;
        c.simulatedPoints += RACE_POINTS.sprintP1;
      }
    } else {
      // Costruttori: assegna i punti della scuderia
      const addConstructorPoints = (targetId: string | undefined, pts: number, isWin = false) => {
        if (!targetId) return;
        // Se targetId è constructorId diretto o id di un pilota
        const constrId = contenderMap.has(targetId) ? targetId : driverToConstructor.get(targetId);
        if (constrId && contenderMap.has(constrId)) {
          const c = contenderMap.get(constrId)!;
          c.simulatedPoints += pts;
          if (isWin) c.simulatedWins += 1;
        }
      };

      addConstructorPoints(r.raceWinnerId, RACE_POINTS.p1, true);
      addConstructorPoints(r.raceSecondId, RACE_POINTS.p2);
      addConstructorPoints(r.raceThirdId, RACE_POINTS.p3);
      addConstructorPoints(r.fastestLapDriverId, RACE_POINTS.fastestLap);
      if (r.hasSprint) {
        addConstructorPoints(r.sprintWinnerId, RACE_POINTS.sprintP1);
      }
    }
  }

  // Calcolo totali correnti e max possibili
  for (const c of contenderMap.values()) {
    c.totalPoints = Math.round((c.currentPoints + c.simulatedPoints) * 10) / 10;
    c.totalWins = c.currentWins + c.simulatedWins;

    // Quanti punti rimangono ancora NON simulati per questo pilota/costruttore?
    // Per ogni round rimanente, se non è stato assegnato il 1° posto (o FL/sprint) a questo pilota,
    // potrebbe teoricamente vincerlo!
    let potentialUnclaimed = 0;
    for (const r of remainingRounds) {
      if (mode === 'drivers') {
        const isAlreadyWinner = r.raceWinnerId === c.id;
        const isAlreadySecond = r.raceSecondId === c.id;
        const isAlreadyThird = r.raceThirdId === c.id;
        const hasFL = r.fastestLapDriverId === c.id;
        const hasSprint = r.hasSprint && r.sprintWinnerId === c.id;

        // Se non ha già vinto la gara:
        if (!isAlreadyWinner) {
          // Se la vittoria è già presa da qualcun altro, il massimo è il 2° posto (18) o 3° (15) o 0
          if (!r.raceWinnerId) {
            potentialUnclaimed += RACE_POINTS.p1;
          } else if (!r.raceSecondId && !isAlreadySecond && !isAlreadyThird) {
            potentialUnclaimed += RACE_POINTS.p2;
          } else if (!r.raceThirdId && !isAlreadyThird) {
            potentialUnclaimed += RACE_POINTS.p3;
          }
        }
        if (!hasFL && !r.fastestLapDriverId) {
          potentialUnclaimed += RACE_POINTS.fastestLap;
        }
        if (r.hasSprint && !hasSprint && !r.sprintWinnerId) {
          potentialUnclaimed += RACE_POINTS.sprintP1;
        }
      } else {
        // Costruttore: se la vittoria non è ancora assegnata, max 44 (o 59 con sprint)
        const constrWinner = r.raceWinnerId ? (contenderMap.has(r.raceWinnerId) ? r.raceWinnerId : driverToConstructor.get(r.raceWinnerId)) : undefined;
        if (!constrWinner) {
          potentialUnclaimed += 44 + (r.hasSprint ? 15 : 0);
        } else if (constrWinner === c.id) {
          // Ha già il 1° posto, potrebbe ancora fare 2° posto (18) se non assegnato
          if (!r.raceSecondId) potentialUnclaimed += 18;
          if (!r.fastestLapDriverId) potentialUnclaimed += 1;
          if (r.hasSprint && !r.sprintWinnerId) potentialUnclaimed += 7;
        } else {
          // Un altro team ha vinto, questo team può al massimo fare 2° + 3° (18 + 15 = 33) + FL (1)
          if (!r.raceSecondId) potentialUnclaimed += 18;
          if (!r.raceThirdId) potentialUnclaimed += 15;
          if (!r.fastestLapDriverId) potentialUnclaimed += 1;
          if (r.hasSprint) potentialUnclaimed += 15;
        }
      }
    }

    c.maxPossiblePoints = Math.round((c.totalPoints + potentialUnclaimed) * 10) / 10;
  }

  // Ordiniamo per: 1. Punti totali (discendente), 2. Vittorie totali, 3. Nome
  const sorted = Array.from(contenderMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return a.name.localeCompare(b.name);
  });

  const leader = sorted[0];
  let second = sorted[1];

  // Assegnazione posizioni e gap
  sorted.forEach((c, index) => {
    c.position = index + 1;
    c.gapToLeader = leader ? Math.round((leader.totalPoints - c.totalPoints) * 10) / 10 : 0;
  });

  // Verifica eliminazione e titolo
  // Un contendente è eliminato se i suoi maxPossiblePoints sono inferiori ai totalPoints del leader
  // (o a parità di punti max con meno vittorie possibili del leader)
  let contendersInContentionCount = 0;
  for (const c of sorted) {
    if (c === leader) {
      contendersInContentionCount++;
      continue;
    }
    const cannotReach = c.maxPossiblePoints < leader.totalPoints ||
      (c.maxPossiblePoints === leader.totalPoints && (c.totalWins + remainingRounds.length) < leader.totalWins);

    if (cannotReach) {
      c.isEliminated = true;
    } else {
      contendersInContentionCount++;
    }
  }

  // Campione Matematico:
  // Se nessun altro concorrente può superare i punti attuali del leader
  let champion: SimulatorContender | null = null;
  if (leader && (contendersInContentionCount === 1 || remainingRounds.length === 0)) {
    leader.isChampion = true;
    champion = leader;
  }

  // Magic Number:
  // Quanti punti mancano al leader affinché maxPossiblePoints del 2° non possano più superarlo
  let magicNumber: number | null = null;
  if (leader && !champion && second) {
    const diff = Math.round((second.maxPossiblePoints - leader.totalPoints) * 10) / 10;
    magicNumber = Math.max(0, Math.ceil(diff + 1));
  }

  // Scenario del prossimo round (se c'è almeno un round rimanente e non c'è ancora un campione)
  let nextRoundClinchScenario: string | null = null;
  if (!champion && leader && second && remainingRounds.length > 0) {
    const nextRound = remainingRounds[0];
    const nextMax = maxRoundPoints(nextRound.hasSprint, mode);
    // Punti rimanenti DOPO il prossimo round
    const remainingAfterNext = remainingRounds.slice(1).reduce((acc, r) => acc + maxRoundPoints(r.hasSprint, mode), 0);

    // Se il leader al prossimo round può estendere il gap oltre remainingAfterNext:
    const requiredGap = remainingAfterNext + 1;
    const currentGap = leader.totalPoints - second.totalPoints;
    const neededGain = requiredGap - currentGap;

    if (neededGain <= nextMax) {
      if (neededGain <= 0) {
        nextRoundClinchScenario = `A ${nextRound.raceName}, a ${leader.name} basta mantenere l'attuale distacco per laurearsi Campione del Mondo!`;
      } else {
        nextRoundClinchScenario = `A ${nextRound.raceName}, ${leader.name} sarà Campione del Mondo se guadagnerà almeno ${neededGain} punti su ${second.name}.`;
      }
    }
  }

  return {
    mode,
    season,
    totalRounds: rounds.length,
    remainingRoundsCount: remainingRounds.length,
    remainingPointsOnTable,
    magicNumber,
    champion,
    contendersInContentionCount,
    standings: sorted,
    nextRoundClinchScenario
  };
}
