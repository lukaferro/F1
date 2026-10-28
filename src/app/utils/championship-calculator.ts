import {
  ChampionshipSimulationResult,
  SimulatorContender,
  SimulatorRaceRound
} from '../models/championship-simulator';

export interface SeasonScoringRules {
  p1: number;
  p2: number;
  p3: number;
  fastestLap: number;
  hasFastestLapPoint: boolean;
  sprintP1: number;
  sprintP2: number;
  hasSprint: boolean;
  constructorMaxNormal: number;
  constructorMaxSprint: number;
}

/**
 * Restituisce le regole ufficiali di punteggio FIA in base all'anno della stagione.
 * - Punto giro veloce: assegnato nel 1950-1959 e nel 2019-2024; ABOLITO dal 2025 in poi e assente nel 1960-2018.
 * - Scala punti gara: 25-18-15 (2010+), 10-8-6 (2003-2009), 10-6-4 (1991-2002), 9-6-4 (1961-1990), ecc.
 * - Sprint: introdotta nel 2021 (3-2-1 pt), estesa dal 2022 a oggi (8-7-6-5-4-3-2-1 pt).
 */
export function getSeasonScoringRules(season: number): SeasonScoringRules {
  let p1 = 25;
  let p2 = 18;
  let p3 = 15;

  if (season >= 2010) {
    p1 = 25;
    p2 = 18;
    p3 = 15;
  } else if (season >= 2003) {
    p1 = 10;
    p2 = 8;
    p3 = 6;
  } else if (season >= 1991) {
    p1 = 10;
    p2 = 6;
    p3 = 4;
  } else if (season >= 1961) {
    p1 = 9;
    p2 = 6;
    p3 = 4;
  } else if (season === 1960) {
    p1 = 8;
    p2 = 5;
    p3 = 4;
  } else {
    // 1950 - 1959
    p1 = 8;
    p2 = 6;
    p3 = 4;
  }

  // Punto addizionale per il giro veloce
  // Abolito ufficialmente dal World Motor Sport Council FIA a partire dalla stagione 2025
  const hasFastestLapPoint = (season >= 2019 && season <= 2024) || (season >= 1950 && season <= 1959);
  const fastestLap = hasFastestLapPoint ? 1 : 0;

  // Regole Sprint
  let sprintP1 = 0;
  let sprintP2 = 0;
  let hasSprint = false;

  if (season >= 2022) {
    sprintP1 = 8;
    sprintP2 = 7;
    hasSprint = true;
  } else if (season === 2021) {
    sprintP1 = 3;
    sprintP2 = 2;
    hasSprint = true;
  }

  const constructorMaxNormal = p1 + p2 + fastestLap;
  const constructorMaxSprint = sprintP1 + sprintP2;

  return {
    p1,
    p2,
    p3,
    fastestLap,
    hasFastestLapPoint,
    sprintP1,
    sprintP2,
    hasSprint,
    constructorMaxNormal,
    constructorMaxSprint
  };
}

/**
 * Calcola i punti massimi teorici ancora disponibili per pilota o costruttore in un dato round
 */
export function maxRoundPoints(
  hasSprint: boolean,
  mode: 'drivers' | 'constructors',
  season = 2024
): number {
  const rules = getSeasonScoringRules(season);
  if (mode === 'drivers') {
    return rules.p1 + rules.fastestLap + (hasSprint ? rules.sprintP1 : 0);
  } else {
    return rules.constructorMaxNormal + (hasSprint ? rules.constructorMaxSprint : 0);
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
  const rules = getSeasonScoringRules(season);
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
  const driverToConstructor = new Map<string, string>();
  for (const c of baseContenders) {
    driverToConstructor.set(c.id, c.constructorId);
  }

  const remainingRounds = rounds.filter(r => !r.isCompleted);
  let remainingPointsOnTable = 0;

  // Calcolo punti simulati round per round
  for (const r of remainingRounds) {
    const roundMax = maxRoundPoints(r.hasSprint, mode, season);
    remainingPointsOnTable += roundMax;

    if (mode === 'drivers') {
      if (r.raceWinnerId && contenderMap.has(r.raceWinnerId)) {
        const c = contenderMap.get(r.raceWinnerId)!;
        c.simulatedPoints += rules.p1;
        c.simulatedWins += 1;
      }
      if (r.raceSecondId && contenderMap.has(r.raceSecondId)) {
        const c = contenderMap.get(r.raceSecondId)!;
        c.simulatedPoints += rules.p2;
      }
      if (r.raceThirdId && contenderMap.has(r.raceThirdId)) {
        const c = contenderMap.get(r.raceThirdId)!;
        c.simulatedPoints += rules.p3;
      }
      if (rules.hasFastestLapPoint && r.fastestLapDriverId && contenderMap.has(r.fastestLapDriverId)) {
        const c = contenderMap.get(r.fastestLapDriverId)!;
        c.simulatedPoints += rules.fastestLap;
      }
      if (r.hasSprint && r.sprintWinnerId && contenderMap.has(r.sprintWinnerId)) {
        const c = contenderMap.get(r.sprintWinnerId)!;
        c.simulatedPoints += rules.sprintP1;
      }
    } else {
      // Costruttori: assegna i punti della scuderia
      const addConstructorPoints = (targetId: string | undefined, pts: number, isWin = false) => {
        if (!targetId || pts === 0) return;
        const constrId = contenderMap.has(targetId) ? targetId : driverToConstructor.get(targetId);
        if (constrId && contenderMap.has(constrId)) {
          const c = contenderMap.get(constrId)!;
          c.simulatedPoints += pts;
          if (isWin) c.simulatedWins += 1;
        }
      };

      addConstructorPoints(r.raceWinnerId, rules.p1, true);
      addConstructorPoints(r.raceSecondId, rules.p2);
      addConstructorPoints(r.raceThirdId, rules.p3);
      if (rules.hasFastestLapPoint) {
        addConstructorPoints(r.fastestLapDriverId, rules.fastestLap);
      }
      if (r.hasSprint) {
        addConstructorPoints(r.sprintWinnerId, rules.sprintP1);
      }
    }
  }

  // Calcolo totali correnti e max possibili
  for (const c of contenderMap.values()) {
    c.totalPoints = Math.round((c.currentPoints + c.simulatedPoints) * 10) / 10;
    c.totalWins = c.currentWins + c.simulatedWins;

    let potentialUnclaimed = 0;
    for (const r of remainingRounds) {
      if (mode === 'drivers') {
        const isAlreadyWinner = r.raceWinnerId === c.id;
        const isAlreadySecond = r.raceSecondId === c.id;
        const isAlreadyThird = r.raceThirdId === c.id;
        const hasFL = rules.hasFastestLapPoint && r.fastestLapDriverId === c.id;
        const hasSprint = r.hasSprint && r.sprintWinnerId === c.id;

        if (!isAlreadyWinner) {
          if (!r.raceWinnerId) {
            potentialUnclaimed += rules.p1;
          } else if (!r.raceSecondId && !isAlreadySecond && !isAlreadyThird) {
            potentialUnclaimed += rules.p2;
          } else if (!r.raceThirdId && !isAlreadyThird) {
            potentialUnclaimed += rules.p3;
          }
        }
        if (rules.hasFastestLapPoint && !hasFL && !r.fastestLapDriverId) {
          potentialUnclaimed += rules.fastestLap;
        }
        if (r.hasSprint && !hasSprint && !r.sprintWinnerId) {
          potentialUnclaimed += rules.sprintP1;
        }
      } else {
        const constrWinner = r.raceWinnerId ? (contenderMap.has(r.raceWinnerId) ? r.raceWinnerId : driverToConstructor.get(r.raceWinnerId)) : undefined;
        if (!constrWinner) {
          potentialUnclaimed += rules.constructorMaxNormal + (r.hasSprint ? rules.constructorMaxSprint : 0);
        } else if (constrWinner === c.id) {
          if (!r.raceSecondId) potentialUnclaimed += rules.p2;
          if (rules.hasFastestLapPoint && !r.fastestLapDriverId) potentialUnclaimed += rules.fastestLap;
          if (r.hasSprint && !r.sprintWinnerId) potentialUnclaimed += rules.sprintP2;
        } else {
          if (!r.raceSecondId) potentialUnclaimed += rules.p2;
          if (!r.raceThirdId) potentialUnclaimed += rules.p3;
          if (rules.hasFastestLapPoint && !r.fastestLapDriverId) potentialUnclaimed += rules.fastestLap;
          if (r.hasSprint) potentialUnclaimed += rules.constructorMaxSprint;
        }
      }
    }

    c.maxPossiblePoints = Math.round((c.totalPoints + potentialUnclaimed) * 10) / 10;
  }

  // Ordinamento: Punti totali, Vittorie totali, Nome
  const sorted = Array.from(contenderMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return a.name.localeCompare(b.name);
  });

  const leader = sorted[0];
  let second = sorted[1];

  sorted.forEach((c, index) => {
    c.position = index + 1;
    c.gapToLeader = leader ? Math.round((leader.totalPoints - c.totalPoints) * 10) / 10 : 0;
  });

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

  let champion: SimulatorContender | null = null;
  if (leader && (contendersInContentionCount === 1 || remainingRounds.length === 0)) {
    leader.isChampion = true;
    champion = leader;
  }

  let magicNumber: number | null = null;
  if (leader && !champion && second) {
    const diff = Math.round((second.maxPossiblePoints - leader.totalPoints) * 10) / 10;
    magicNumber = Math.max(0, Math.ceil(diff + 1));
  }

  let nextRoundClinchScenario: string | null = null;
  if (!champion && leader && second && remainingRounds.length > 0) {
    const nextRound = remainingRounds[0];
    const nextMax = maxRoundPoints(nextRound.hasSprint, mode, season);
    const remainingAfterNext = remainingRounds.slice(1).reduce((acc, r) => acc + maxRoundPoints(r.hasSprint, mode, season), 0);

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
