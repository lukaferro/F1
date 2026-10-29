import {
  ChampionshipSimulationResult,
  SimulatorContender,
  SimulatorRaceRound
} from '../models/championship-simulator';

export interface SeasonScoringRules {
  racePoints: number[];
  sprintPoints: number[];
  p1: number;
  p2: number;
  p3: number;
  fastestLap: number;
  hasFastestLapPoint: boolean;
  fastestLapRequiresTop10: boolean;
  sprintP1: number;
  sprintP2: number;
  hasSprint: boolean;
  constructorMaxNormal: number;
  constructorMaxSprint: number;
}

/**
 * Restituisce le regole ufficiali di punteggio FIA in base all'anno della stagione.
 * - Zona punti gara:
 *   - 2010+: primi 10 (25-18-15-12-10-8-6-4-2-1)
 *   - 2003-2009: primi 8 (10-8-6-5-4-3-2-1)
 *   - 1991-2002: primi 6 (10-6-4-3-2-1)
 *   - 1961-1990: primi 6 (9-6-4-3-2-1)
 *   - 1960: primi 6 (8-5-4-3-2-1)
 *   - 1950-1959: primi 5 (8-6-4-3-2)
 * - Punto giro veloce:
 *   - 2025+: ABOLITO ufficialmente dalla FIA (0 pt)
 *   - 2019-2024: 1 pt solo se il pilota finisce nella Top 10
 *   - 1960-2018: nessun punto (0 pt)
 *   - 1950-1959: 1 pt
 * - Sprint:
 *   - 2022+: primi 8 (8-7-6-5-4-3-2-1)
 *   - 2021: primi 3 (3-2-1)
 *   - pre-2021: nessuna Sprint
 */
export function getSeasonScoringRules(season: number): SeasonScoringRules {
  let racePoints: number[];

  if (season >= 2010) {
    racePoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  } else if (season >= 2003) {
    racePoints = [10, 8, 6, 5, 4, 3, 2, 1];
  } else if (season >= 1991) {
    racePoints = [10, 6, 4, 3, 2, 1];
  } else if (season >= 1961) {
    racePoints = [9, 6, 4, 3, 2, 1];
  } else if (season === 1960) {
    racePoints = [8, 5, 4, 3, 2, 1];
  } else {
    // 1950 - 1959
    racePoints = [8, 6, 4, 3, 2];
  }

  // Punto addizionale per il giro veloce
  const hasFastestLapPoint = (season >= 2019 && season <= 2024) || (season >= 1950 && season <= 1959);
  const fastestLapRequiresTop10 = season >= 2019 && season <= 2024;
  const fastestLap = hasFastestLapPoint ? 1 : 0;

  // Regole Sprint
  let sprintPoints: number[] = [];
  let hasSprint = false;

  if (season >= 2022) {
    sprintPoints = [8, 7, 6, 5, 4, 3, 2, 1];
    hasSprint = true;
  } else if (season === 2021) {
    sprintPoints = [3, 2, 1];
    hasSprint = true;
  }

  const p1 = racePoints[0] || 0;
  const p2 = racePoints[1] || 0;
  const p3 = racePoints[2] || 0;
  const sprintP1 = sprintPoints[0] || 0;
  const sprintP2 = sprintPoints[1] || 0;

  const constructorMaxNormal = p1 + p2 + fastestLap;
  const constructorMaxSprint = sprintP1 + sprintP2;

  return {
    racePoints,
    sprintPoints,
    p1,
    p2,
    p3,
    fastestLap,
    hasFastestLapPoint,
    fastestLapRequiresTop10,
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
 * Helper per estrarre e sincronizzare le posizioni di gara del round
 */
export function extractRoundRacePositions(
  round: SimulatorRaceRound,
  rules: SeasonScoringRules
): (string | undefined)[] {
  const maxLen = Math.max(rules.racePoints.length, round.racePositions?.length || 0);
  const list: (string | undefined)[] = [];

  for (let i = 0; i < maxLen; i++) {
    if (round.racePositions && round.racePositions[i] !== undefined) {
      list.push(round.racePositions[i]);
    } else if (i === 0 && round.raceWinnerId !== undefined) {
      list.push(round.raceWinnerId);
    } else if (i === 1 && round.raceSecondId !== undefined) {
      list.push(round.raceSecondId);
    } else if (i === 2 && round.raceThirdId !== undefined) {
      list.push(round.raceThirdId);
    } else {
      list.push(undefined);
    }
  }

  return list;
}

/**
 * Helper per estrarre e sincronizzare le posizioni della Sprint del round
 */
export function extractRoundSprintPositions(
  round: SimulatorRaceRound,
  rules: SeasonScoringRules
): (string | undefined)[] {
  if (!rules.hasSprint || !round.hasSprint) return [];
  const count = rules.sprintPoints.length;
  const list: (string | undefined)[] = [];

  for (let i = 0; i < count; i++) {
    if (round.sprintPositions && round.sprintPositions[i] !== undefined) {
      list.push(round.sprintPositions[i]);
    } else if (i === 0 && round.sprintWinnerId !== undefined) {
      list.push(round.sprintWinnerId);
    } else {
      list.push(undefined);
    }
  }

  return list;
}

/**
 * Calcola i punti assegnati in un singolo round sulla base dei piazzamenti configurati
 */
export function computeConfiguredRoundPoints(
  round: SimulatorRaceRound,
  rules: SeasonScoringRules,
  mode: 'drivers' | 'constructors',
  driverToConstructor?: Map<string, string>
): { points: Map<string, number>; winnerId: string | undefined } {
  const points = new Map<string, number>();
  const dnfSet = new Set<string>(round.dnfContenderIds || []);
  const racePos = extractRoundRacePositions(round, rules);
  const sprintPos = extractRoundSprintPositions(round, rules);

  const resolveId = (rawId: string | undefined): string | undefined => {
    if (!rawId) return undefined;
    if (mode === 'drivers') return rawId;
    return driverToConstructor?.get(rawId) || rawId;
  };

  const addPts = (rawId: string | undefined, pts: number) => {
    if (!rawId || pts <= 0 || dnfSet.has(rawId)) return;
    const targetId = resolveId(rawId);
    if (!targetId || dnfSet.has(targetId)) return;
    points.set(targetId, (points.get(targetId) ?? 0) + pts);
  };

  let winnerId: string | undefined;

  // 1. Punti Gara
  racePos.forEach((rawId, idx) => {
    if (!rawId || dnfSet.has(rawId)) return;
    const targetId = resolveId(rawId);
    if (!targetId || dnfSet.has(targetId)) return;
    if (idx === 0) {
      winnerId = targetId;
    }
    const pts = rules.racePoints[idx] || 0;
    if (pts > 0) {
      addPts(rawId, pts);
    }
  });

  // 2. Punti Sprint
  sprintPos.forEach((rawId, idx) => {
    const pts = rules.sprintPoints[idx] || 0;
    if (pts > 0) {
      addPts(rawId, pts);
    }
  });

  // 3. Punto Giro Veloce
  if (rules.hasFastestLapPoint && round.fastestLapDriverId && !dnfSet.has(round.fastestLapDriverId)) {
    let awardsPoint = true;
    if (rules.fastestLapRequiresTop10) {
      const assignedPositions = racePos.filter(id => id !== undefined);
      if (assignedPositions.length > 0) {
        const top10Ids = racePos.slice(0, 10);
        awardsPoint = top10Ids.includes(round.fastestLapDriverId);
      }
    }
    if (awardsPoint) {
      addPts(round.fastestLapDriverId, rules.fastestLap);
    }
  }

  return { points, winnerId };
}

/**
 * Ricalcola la classifica simulata (supportando sia round futuri sia modifiche "What If" su round già disputati)
 * e le combinazioni matematiche di titolo.
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

  baseContenders.forEach((c, idx) => {
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
      position: idx + 1,
      originalPosition: idx + 1,
      positionDelta: 0,
      pointsDelta: 0
    });
  });

  // Mappa driverId -> constructorId
  const driverToConstructor = new Map<string, string>();
  for (const c of baseContenders) {
    driverToConstructor.set(c.id, c.constructorId);
  }

  const remainingRounds = rounds.filter(r => !r.isCompleted);
  const modifiedCompletedRounds = rounds.filter(r => r.isCompleted && r.isModified);
  let remainingPointsOnTable = 0;

  // 1. Applica le variazioni ("What If") sui round già disputati ma modificati dall'utente
  for (const r of modifiedCompletedRounds) {
    const { points: newPtsMap, winnerId: newWinnerId } = computeConfiguredRoundPoints(
      r,
      rules,
      mode,
      driverToConstructor
    );

    const realPtsRecord = mode === 'drivers' ? (r.realDriverPoints || {}) : (r.realConstructorPoints || {});
    const realOrder = mode === 'drivers' ? (r.realRaceOrder || []) : (r.realConstructorRaceOrder || []);
    const realWinnerId = realOrder[0];

    for (const c of contenderMap.values()) {
      const realPts = realPtsRecord[c.id] ?? 0;
      const newPts = newPtsMap.get(c.id) ?? 0;
      const deltaPts = newPts - realPts;
      c.simulatedPoints += deltaPts;

      const hadRealWin = realWinnerId === c.id ? 1 : 0;
      const hasNewWin = newWinnerId === c.id ? 1 : 0;
      c.simulatedWins += (hasNewWin - hadRealWin);
    }
  }

  // 2. Assegnazione punti simulati per ciascun round futuro (non ancora completato)
  for (const r of remainingRounds) {
    const roundMax = maxRoundPoints(r.hasSprint, mode, season);
    remainingPointsOnTable += roundMax;

    const { points: newPtsMap, winnerId: newWinnerId } = computeConfiguredRoundPoints(
      r,
      rules,
      mode,
      driverToConstructor
    );

    for (const [id, pts] of newPtsMap.entries()) {
      if (contenderMap.has(id)) {
        contenderMap.get(id)!.simulatedPoints += pts;
      }
    }
    if (newWinnerId && contenderMap.has(newWinnerId)) {
      contenderMap.get(newWinnerId)!.simulatedWins += 1;
    }
  }

  // 3. Calcolo totali e punti massimi potenziali raggiungibili (maxPossiblePoints)
  for (const c of contenderMap.values()) {
    c.simulatedPoints = Math.round(c.simulatedPoints * 10) / 10;
    c.totalPoints = Math.max(0, Math.round((c.currentPoints + c.simulatedPoints) * 10) / 10);
    c.totalWins = Math.max(0, c.currentWins + c.simulatedWins);
    c.pointsDelta = Math.round((c.totalPoints - c.currentPoints) * 10) / 10;

    let potentialUnclaimed = 0;

    for (const r of remainingRounds) {
      const dnfSet = new Set<string>(r.dnfContenderIds || []);
      if (dnfSet.has(c.id)) {
        continue;
      }
      if (mode === 'constructors' && dnfSet.has(c.constructorId)) {
        continue;
      }

      const racePos = extractRoundRacePositions(r, rules);
      const sprintPos = extractRoundSprintPositions(r, rules);

      if (mode === 'drivers') {
        const alreadyInRace = racePos.includes(c.id);
        if (!alreadyInRace) {
          const freeIdx = racePos.findIndex(p => !p);
          if (freeIdx !== -1 && freeIdx < rules.racePoints.length) {
            potentialUnclaimed += rules.racePoints[freeIdx];
          }
        }

        if (r.hasSprint && rules.hasSprint) {
          const alreadyInSprint = sprintPos.includes(c.id);
          if (!alreadyInSprint) {
            const freeSprintIdx = sprintPos.findIndex(p => !p);
            if (freeSprintIdx !== -1 && freeSprintIdx < rules.sprintPoints.length) {
              potentialUnclaimed += rules.sprintPoints[freeSprintIdx];
            }
          }
        }

        if (rules.hasFastestLapPoint) {
          if (!r.fastestLapDriverId || r.fastestLapDriverId === c.id) {
            potentialUnclaimed += rules.fastestLap;
          }
        }
      } else {
        const teamCarsInRace = racePos.filter(id => {
          if (!id) return false;
          const constrId = contenderMap.has(id) ? id : driverToConstructor.get(id);
          return constrId === c.id;
        }).length;

        const maxAdditionalCars = Math.max(0, 2 - teamCarsInRace);
        let carsAdded = 0;

        for (let i = 0; i < rules.racePoints.length && carsAdded < maxAdditionalCars; i++) {
          if (!racePos[i]) {
            potentialUnclaimed += rules.racePoints[i];
            carsAdded++;
          }
        }

        if (r.hasSprint && rules.hasSprint) {
          const teamCarsInSprint = sprintPos.filter(id => {
            if (!id) return false;
            const constrId = contenderMap.has(id) ? id : driverToConstructor.get(id);
            return constrId === c.id;
          }).length;

          const maxAdditionalSprintCars = Math.max(0, 2 - teamCarsInSprint);
          let sprintCarsAdded = 0;

          for (let i = 0; i < rules.sprintPoints.length && sprintCarsAdded < maxAdditionalSprintCars; i++) {
            if (!sprintPos[i]) {
              potentialUnclaimed += rules.sprintPoints[i];
              sprintCarsAdded++;
            }
          }
        }

        if (rules.hasFastestLapPoint) {
          const constrFl = r.fastestLapDriverId
            ? (contenderMap.has(r.fastestLapDriverId) ? r.fastestLapDriverId : driverToConstructor.get(r.fastestLapDriverId))
            : undefined;
          if (!constrFl || constrFl === c.id) {
            potentialUnclaimed += rules.fastestLap;
          }
        }
      }
    }

    c.maxPossiblePoints = Math.round((c.totalPoints + potentialUnclaimed) * 10) / 10;
  }

  // Ordinamento classifica: Punti Totali, Vittorie Totali, Nome
  const sorted = Array.from(contenderMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return a.name.localeCompare(b.name);
  });

  const leader = sorted[0];
  const second = sorted[1];
  const originalChampion = baseContenders[0] ? contenderMap.get(baseContenders[0].id) || null : null;

  sorted.forEach((c, index) => {
    c.position = index + 1;
    c.positionDelta = (c.originalPosition ?? c.position) - c.position;
    c.gapToLeader = leader ? Math.round((leader.totalPoints - c.totalPoints) * 10) / 10 : 0;
  });

  // Determinazione eliminati matematici tenendo conto dello spareggio FIA per vittorie
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

  // Calcolo Magic Number preciso con regolamento spareggio
  let magicNumber: number | null = null;
  if (leader && !champion && second) {
    const diff = Math.round((second.maxPossiblePoints - leader.totalPoints) * 10) / 10;
    if (diff < 0) {
      magicNumber = 0;
    } else {
      const leaderGuaranteedWinsTiebreak = leader.totalWins > (second.totalWins + remainingRounds.length);
      magicNumber = leaderGuaranteedWinsTiebreak ? Math.max(0, Math.ceil(diff)) : Math.max(0, Math.floor(diff) + 1);
    }
  }

  // Scenario Clinch per il prossimo Gran Premio
  let nextRoundClinchScenario: string | null = null;
  if (!champion && leader && second && remainingRounds.length > 0) {
    const nextRound = remainingRounds[0];
    const nextMax = maxRoundPoints(nextRound.hasSprint, mode, season);
    const remainingAfterNext = remainingRounds.slice(1).reduce((acc, r) => acc + maxRoundPoints(r.hasSprint, mode, season), 0);

    const requiredGap = remainingAfterNext + 1;
    const currentGap = leader.totalPoints - second.totalPoints;
    const neededGain = Math.ceil(requiredGap - currentGap);

    if (neededGain <= nextMax) {
      if (neededGain <= 0) {
        nextRoundClinchScenario = `A ${nextRound.raceName}, a ${leader.name} basta mantenere l'attuale distacco per laurearsi Campione del Mondo.`;
      } else {
        nextRoundClinchScenario = `A ${nextRound.raceName}, ${leader.name} sarà Campione del Mondo se guadagnerà almeno ${neededGain} punti su ${second.name}.`;
      }
    }
  }

  const modifiedRoundsCount = rounds.filter(r => r.isModified).length;
  const isHistoryRewritten = Boolean(
    modifiedRoundsCount > 0 && leader && originalChampion && leader.id !== originalChampion.id
  );

  return {
    mode,
    season,
    totalRounds: rounds.length,
    remainingRoundsCount: remainingRounds.length,
    remainingPointsOnTable,
    magicNumber,
    champion,
    originalChampion,
    isHistoryRewritten,
    modifiedRoundsCount,
    contendersInContentionCount,
    standings: sorted,
    nextRoundClinchScenario
  };
}
