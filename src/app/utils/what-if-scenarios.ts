import { DriverStanding, ConstructorStanding, SeasonScheduleItem } from '../services/jolpica.service';
import { getSeasonScoringRules } from './championship-calculator';

export type FutureScenarioMode = 'trend' | 'leader-dominance' | 'chaser-comeback' | 'leader-dnf';

export interface HistoricalPivot {
  id: string;
  season: number;
  round: number;
  raceName: string;
  circuitName: string;
  title: string;
  description: string;
  // Modifica al risultato del round
  winnerId: string;
  secondId?: string;
  dnfIds?: string[];
  originalOutcome: string;
}

export interface ScenarioPointNode {
  round: number;
  raceName: string;
  isProjected: boolean;
  points: number;
  cumulative: number;
  gapToLeader: number;
  position: number;
}

export interface ScenarioContenderSeries {
  id: string;
  name: string;
  shortName: string;
  constructorName: string;
  color: string;
  isLeader: boolean;
  realTotalPoints: number;
  projectedTotalPoints: number;
  realNodes: ScenarioPointNode[];
  projectedNodes: ScenarioPointNode[];
  // Coordinate SVG calcolate
  realPathD?: string;
  projectedPathD?: string;
}

export interface ScenarioSimulationOutcome {
  mode: 'future-projections' | 'historical-what-if';
  season: number;
  title: string;
  summary: string;
  winnerName: string;
  winnerColor: string;
  winnerPoints: number;
  runnerUpName: string;
  runnerUpPoints: number;
  gap: number;
  isHistoryChanged: boolean;
  clinchRoundNumber?: number;
  clinchRoundName?: number | string;
  nextRaceClinchHint?: string;
  series: ScenarioContenderSeries[];
  roundsAxis: Array<{
    round: number;
    name: string;
    isProjected: boolean;
    date: string;
  }>;
}

/**
 * Bivi storici celebri pre-configurati per la modalità "What If"
 */
export const FAMOUS_HISTORICAL_PIVOTS: HistoricalPivot[] = [
  // 2021
  {
    id: '2021-silverstone',
    season: 2021,
    round: 10,
    raceName: 'British GP',
    circuitName: 'Silverstone',
    title: 'Silverstone 2021: Verstappen vince senza il contatto al via',
    description: 'Max Verstappen evita l\'incidente alla Copse con Hamilton e va a vincere la gara con giro veloce.',
    winnerId: 'max_verstappen',
    secondId: 'hamilton',
    originalOutcome: 'Hamilton vinse (+25 pt), Verstappen si ritirò al giro 1 (0 pt).'
  },
  {
    id: '2021-baku',
    season: 2021,
    round: 6,
    raceName: 'Azerbaijan GP',
    circuitName: 'Baku',
    title: 'Baku 2021: Nessuna foratura per Verstappen al giro 46',
    description: 'La gomma di Verstappen regge sul rettilineo principale e Max vince davanti a Perez, con Hamilton 3°.',
    winnerId: 'max_verstappen',
    secondId: 'perez',
    originalOutcome: 'Verstappen forò da leader (0 pt), Hamilton fece "brake magic" alla ripartenza finendo 15° (0 pt).'
  },
  {
    id: '2021-abudhabi',
    season: 2021,
    round: 22,
    raceName: 'Abu Dhabi GP',
    circuitName: 'Yas Marina',
    title: 'Abu Dhabi 2021: La gara termina sotto Safety Car',
    description: 'La Safety Car di Latifi non rientra all\'ultimo giro e Hamilton vince la gara e il titolo mondiale.',
    winnerId: 'hamilton',
    secondId: 'max_verstappen',
    originalOutcome: 'Verstappen superò Hamilton all\'ultimo giro dopo la ripartenza vincendo il Mondiale.'
  },

  // 2016
  {
    id: '2016-malaysia',
    season: 2016,
    round: 16,
    raceName: 'Malaysian GP',
    circuitName: 'Sepang',
    title: 'Sepang 2016: Il motore di Hamilton non cede mentre è in testa',
    description: 'La Power Unit Mercedes regge fino al traguardo: Lewis vince la gara con Rosberg 3°.',
    winnerId: 'hamilton',
    secondId: 'ricciardo',
    originalOutcome: 'Hamilton si ritirò con fumo dal motore a 15 giri dalla fine; Rosberg chiuse 3° allungando a +23 pt.'
  },

  // 2012
  {
    id: '2012-spa',
    season: 2012,
    round: 12,
    raceName: 'Belgian GP',
    circuitName: 'Spa-Francorchamps',
    title: 'Spa 2012: Alonso non viene eliminato alla prima curva da Grosjean',
    description: 'Fernando Alonso evita la carambola innescata da Grosjean alla Source e conclude sul podio.',
    winnerId: 'button',
    secondId: 'alonso',
    originalOutcome: 'Alonso ritirato dopo un pauroso impatto al via (0 pt). Vettel rimontò fino al 2° posto.'
  },
  {
    id: '2012-suzuka',
    season: 2012,
    round: 15,
    raceName: 'Japanese GP',
    circuitName: 'Suzuka',
    title: 'Suzuka 2012: Alonso non fora al via contro Raikkonen',
    description: 'Alonso non tocca l\'ala di Raikkonen alla partenza e chiude sul podio dietro a Vettel.',
    winnerId: 'vettel',
    secondId: 'alonso',
    originalOutcome: 'Alonso forò e si insabbiò alla prima curva (0 pt); Vettel vinse portandosi a soli -4 pt.'
  },

  // 2010
  {
    id: '2010-abudhabi',
    season: 2010,
    round: 19,
    raceName: 'Abu Dhabi GP',
    circuitName: 'Yas Marina',
    title: 'Abu Dhabi 2010: La Ferrari non anticipa la sosta su Webber',
    description: 'Alonso rimane in pista con pista libera e chiude 4° davanti a Petrov, vincendo il titolo iridato.',
    winnerId: 'vettel',
    secondId: 'hamilton',
    originalOutcome: 'Alonso rimase bloccato dietro a Petrov in 7ª posizione (6 pt); Vettel vinse gara e Mondiale.'
  },

  // 2008
  {
    id: '2008-singapore',
    season: 2008,
    round: 15,
    raceName: 'Singapore GP',
    circuitName: 'Marina Bay',
    title: 'Singapore 2008: Massa vince la gara senza il Crashgate',
    description: 'Nessun incidente provocato per Piquet Jr, sosta regolare e vittoria indisturbata di Felipe Massa.',
    winnerId: 'massa',
    secondId: 'hamilton',
    originalOutcome: 'Massa ripartì con il bocchettone della benzina attaccato chiudendo 13° (0 pt); Hamilton fu 3° (+6 pt).'
  },
  {
    id: '2008-hungary',
    season: 2008,
    round: 11,
    raceName: 'Hungarian GP',
    circuitName: 'Hungaroring',
    title: 'Ungheria 2008: Il motore Ferrari di Massa non cede a 3 giri dalla fine',
    description: 'Felipe domina la corsa dopo una staccata leggendaria su Hamilton e conquista 10 punti pieni.',
    winnerId: 'massa',
    secondId: 'kovalainen',
    originalOutcome: 'Rottura della biella sul rettilineo al 67° giro su 70 (0 pt). Hamilton fu 5°.'
  },

  // 2007
  {
    id: '2007-china',
    season: 2007,
    round: 16,
    raceName: 'Chinese GP',
    circuitName: 'Shanghai',
    title: 'Cina 2007: Hamilton non si insabbia nella corsia box',
    description: 'Hamilton rientra ai box con cautela e conclude 3°, chiudendo matematicamente il campionato mondiale.',
    winnerId: 'raikkonen',
    secondId: 'alonso',
    originalOutcome: 'Hamilton rimase bloccato nella ghiaia all\'ingresso dei box (0 pt); Raikkonen riaprì il mondiale e vinse in Brasile.'
  },

  // 2006
  {
    id: '2006-suzuka',
    season: 2006,
    round: 17,
    raceName: 'Japanese GP',
    circuitName: 'Suzuka',
    title: 'Suzuka 2006: Il motore di Michael Schumacher non cede al comando',
    description: 'Il V8 Ferrari non esplode al 37° giro e Michael Schumacher vince la gara involandosi verso l\'8° titolo.',
    winnerId: 'michael_schumacher',
    secondId: 'alonso',
    originalOutcome: 'Fumata bianca per Schumi al comando (0 pt); Alonso vinse e mise le mani sul secondo iride.'
  },

  // 1994
  {
    id: '1994-adelaide',
    season: 1994,
    round: 16,
    raceName: 'Australian GP',
    circuitName: 'Adelaide',
    title: 'Adelaide 1994: Damon Hill vince la gara dopo l\'urto con Schumacher',
    description: 'La sospensione della Williams di Hill resiste al contatto con Benetton e Hill vince il GP e il titolo.',
    winnerId: 'hill',
    secondId: 'mansell',
    originalOutcome: 'Contatto controverso tra Schumacher e Hill: entrambi ritirati, titolo a Schumacher per 1 punto.'
  }
];

/**
 * Calcola la simulazione di scenario futuro (per la stagione in corso)
 */
export function calculateFutureScenario(
  schedule: SeasonScheduleItem[],
  standings: DriverStanding[],
  season: number,
  scenario: FutureScenarioMode
): ScenarioSimulationOutcome {
  const rules = getSeasonScoringRules(season);
  const todayStr = new Date().toISOString().split('T')[0];

  const contenders = standings.slice(0, 3);
  if (!contenders.length) {
    return {
      mode: 'future-projections',
      season,
      title: 'Proiezioni Campionato',
      summary: 'Dati classifiche non disponibili.',
      winnerName: '',
      winnerColor: '#ffffff',
      winnerPoints: 0,
      runnerUpName: '',
      runnerUpPoints: 0,
      gap: 0,
      isHistoryChanged: false,
      series: [],
      roundsAxis: []
    };
  }

  const leader = contenders[0];
  const second = contenders[1] || leader;
  const third = contenders[2] || second;

  const roundsAxis = schedule.map(item => ({
    round: item.round,
    name: item.raceName,
    isProjected: item.date >= todayStr,
    date: item.date
  }));

  const completedCount = schedule.filter(r => r.date < todayStr).length;
  const remainingRounds = schedule.filter(r => r.date >= todayStr);

  // Inizializza i punteggi cumulativi
  interface Tracker {
    standing: DriverStanding;
    currentCum: number;
    nodes: ScenarioPointNode[];
  }

  const trackers: Tracker[] = contenders.map(c => {
    // Stima punti round per round fino a oggi
    const nodes: ScenarioPointNode[] = [];
    const ptsPerRace = completedCount > 0 ? c.points / completedCount : 0;
    let cum = 0;

    schedule.forEach((item, idx) => {
      if (item.date < todayStr) {
        // Approssimazione proporzionale sui round passati
        const step = idx === completedCount - 1 ? c.points - cum : Math.round(ptsPerRace);
        cum += step;
        nodes.push({
          round: item.round,
          raceName: item.raceName,
          isProjected: false,
          points: step,
          cumulative: cum,
          gapToLeader: 0,
          position: 1
        });
      }
    });

    return {
      standing: c,
      currentCum: c.points,
      nodes
    };
  });

  // Simula i round futuri in base allo scenario scelto
  let clinchRoundNumber: number | undefined;
  let clinchRoundName: string | undefined;

  remainingRounds.forEach((r, futureIdx) => {
    const hasSprint = r.hasSprint && rules.hasSprint;
    const sprintPtsLeader = hasSprint ? rules.sprintP1 : 0;
    const sprintPtsSecond = hasSprint ? rules.sprintP2 : 0;

    let ptsLeader = 0;
    let ptsSecond = 0;
    let ptsThird = 0;

    switch (scenario) {
      case 'leader-dominance':
        // Il leader vince tutte le gare rimanenti
        ptsLeader = rules.p1 + rules.fastestLap + sprintPtsLeader;
        ptsSecond = rules.p2 + sprintPtsSecond;
        ptsThird = rules.p3;
        break;

      case 'chaser-comeback':
        // L'inseguitore vince tutte le gare, il leader fa 3° o 4°
        ptsSecond = rules.p1 + rules.fastestLap + sprintPtsLeader;
        ptsLeader = rules.p3 + sprintPtsSecond;
        ptsThird = rules.p2;
        break;

      case 'leader-dnf':
        // Il leader subisce uno zero nel prossimo GP o nei successivi, mentre il rivale vince
        if (futureIdx === 0) {
          ptsLeader = 0; // DNF!
          ptsSecond = rules.p1 + rules.fastestLap + sprintPtsLeader;
          ptsThird = rules.p2;
        } else {
          ptsLeader = rules.p2;
          ptsSecond = rules.p1 + rules.fastestLap + sprintPtsLeader;
          ptsThird = rules.p3;
        }
        break;

      case 'trend':
      default: {
        // Passo medio recente (ultime gare)
        const avgLeader = completedCount > 0 ? leader.points / completedCount : 18;
        const avgSecond = completedCount > 0 ? second.points / completedCount : 15;
        const avgThird = completedCount > 0 ? third.points / completedCount : 10;
        ptsLeader = Math.round(avgLeader);
        ptsSecond = Math.round(avgSecond);
        ptsThird = Math.round(avgThird);
        break;
      }
    }

    trackers.forEach(t => {
      let earned = 0;
      if (t.standing.driverId === leader.driverId) earned = ptsLeader;
      else if (t.standing.driverId === second.driverId) earned = ptsSecond;
      else earned = ptsThird;

      t.currentCum += earned;
      t.nodes.push({
        round: r.round,
        raceName: r.raceName,
        isProjected: true,
        points: earned,
        cumulative: t.currentCum,
        gapToLeader: 0,
        position: 1
      });
    });

    // Controllo clinch matematico anticipato
    const leaderNow = trackers.find(t => t.standing.driverId === leader.driverId)!.currentCum;
    const secondNow = trackers.find(t => t.standing.driverId === second.driverId)!.currentCum;
    const roundsLeftAfter = remainingRounds.length - 1 - futureIdx;
    const maxPossiblePointsLeft = roundsLeftAfter * (rules.p1 + rules.fastestLap + (rules.hasSprint ? rules.sprintP1 : 0));

    if (!clinchRoundNumber) {
      if (leaderNow - secondNow > maxPossiblePointsLeft) {
        clinchRoundNumber = r.round;
        clinchRoundName = r.raceName;
      } else if (secondNow - leaderNow > maxPossiblePointsLeft) {
        clinchRoundNumber = r.round;
        clinchRoundName = r.raceName;
      }
    }
  });

  // Ordina i risultati finali
  const sortedTrackers = [...trackers].sort((a, b) => b.currentCum - a.currentCum);
  const champ = sortedTrackers[0];
  const runnerUp = sortedTrackers[1] || champ;
  const finalGap = champ.currentCum - runnerUp.currentCum;

  // Calcolo scenario prossima gara per il clinch
  let nextRaceClinchHint: string | undefined;
  if (remainingRounds.length > 0) {
    const nextRound = remainingRounds[0];
    const maxNext = rules.p1 + rules.fastestLap + (nextRound.hasSprint ? rules.sprintP1 : 0);
    const maxAfterNext = (remainingRounds.length - 1) * (rules.p1 + rules.fastestLap + (rules.hasSprint ? rules.sprintP1 : 0));
    const currentGap = leader.points - second.points;
    const needed = maxAfterNext + 1 - currentGap;

    if (needed <= maxNext) {
      nextRaceClinchHint = `A ${nextRound.raceName}, ${leader.fullName} chiude il Mondiale se guadagna almeno ${needed} punti su ${second.fullName}.`;
    } else {
      nextRaceClinchHint = `Il Mondiale non può chiudersi matematicamente a ${nextRound.raceName} (servono ancora almeno due weekend).`;
    }
  }

  let scenarioTitle = 'Scenario Proiezione';
  let scenarioSummary = '';

  switch (scenario) {
    case 'leader-dominance':
      scenarioTitle = 'Dominio del Leader';
      scenarioSummary = `${champ.standing.fullName} vince le gare rimanenti e chiude il campionato con ${champ.currentCum} punti (+${finalGap} su ${runnerUp.standing.fullName}).`;
      break;
    case 'chaser-comeback':
      scenarioTitle = 'Grande Rimonta dell\'Inseguitore';
      scenarioSummary = `${champ.standing.fullName} capitalizza ogni weekend vincendo le gare e chiude con ${champ.currentCum} punti (+${finalGap} di vantaggio).`;
      break;
    case 'leader-dnf':
      scenarioTitle = 'Colpo di Scena (Ritiro del Leader)';
      scenarioSummary = `Il ritiro a zero punti di ${leader.fullName} riapre completamente i giochi a favore di ${champ.standing.fullName} (vantaggio finale di ${finalGap} punti).`;
      break;
    case 'trend':
    default:
      scenarioTitle = 'Trend di Rendimento Attuale';
      scenarioSummary = `Mantenendo il passo punti medio registrato finora, ${champ.standing.fullName} conquista il titolo con ${champ.currentCum} punti.`;
      break;
  }

  const series: ScenarioContenderSeries[] = trackers.map(t => {
    return {
      id: t.standing.driverId,
      name: t.standing.fullName,
      shortName: t.standing.code || t.standing.fullName.split(' ').pop() || '',
      constructorName: t.standing.constructorName,
      color: '#' + (t.standing.driverId === leader.driverId ? 'e10600' : (t.standing.driverId === second.driverId ? 'ff8000' : '00d2be')),
      isLeader: t.standing.driverId === leader.driverId,
      realTotalPoints: t.standing.points,
      projectedTotalPoints: t.currentCum,
      realNodes: t.nodes.filter(n => !n.isProjected),
      projectedNodes: t.nodes.filter(n => n.isProjected)
    };
  });

  return {
    mode: 'future-projections',
    season,
    title: scenarioTitle,
    summary: scenarioSummary,
    winnerName: champ.standing.fullName,
    winnerColor: '#' + (champ.standing.driverId === leader.driverId ? 'e10600' : 'ff8000'),
    winnerPoints: champ.currentCum,
    runnerUpName: runnerUp.standing.fullName,
    runnerUpPoints: runnerUp.currentCum,
    gap: finalGap,
    isHistoryChanged: champ.standing.driverId !== leader.driverId,
    clinchRoundNumber,
    clinchRoundName,
    nextRaceClinchHint,
    series,
    roundsAxis
  };
}

/**
 * Calcola la simulazione "What If" per una stagione storica partendo da un bivio
 */
export function calculateHistoricalWhatIf(
  schedule: SeasonScheduleItem[],
  standings: DriverStanding[],
  season: number,
  pivot: HistoricalPivot | null
): ScenarioSimulationOutcome {
  const rules = getSeasonScoringRules(season);
  const contenders = standings.slice(0, 3);

  if (!contenders.length) {
    return {
      mode: 'historical-what-if',
      season,
      title: 'What If Storico',
      summary: 'Dati classifica non disponibili.',
      winnerName: '',
      winnerColor: '#ffffff',
      winnerPoints: 0,
      runnerUpName: '',
      runnerUpPoints: 0,
      gap: 0,
      isHistoryChanged: false,
      series: [],
      roundsAxis: []
    };
  }

  const originalLeader = contenders[0];
  const originalSecond = contenders[1] || originalLeader;

  const roundsAxis = schedule.map(item => ({
    round: item.round,
    name: item.raceName,
    isProjected: pivot ? item.round >= pivot.round : false,
    date: item.date
  }));

  const totalRounds = schedule.length;

  // Costruisci le traiettorie
  const series: ScenarioContenderSeries[] = contenders.map(c => {
    let cumReal = 0;
    let cumAlt = 0;
    const realNodes: ScenarioPointNode[] = [];
    const projectedNodes: ScenarioPointNode[] = [];

    const avgStep = totalRounds > 0 ? c.points / totalRounds : 0;

    schedule.forEach((item, idx) => {
      const step = idx === totalRounds - 1 ? c.points - cumReal : Math.round(avgStep);
      cumReal += step;

      let altStep = step;
      if (pivot && item.round === pivot.round) {
        if (c.driverId === pivot.winnerId) {
          altStep = rules.p1;
        } else if (c.driverId === pivot.secondId) {
          altStep = rules.p2;
        } else if (pivot.dnfIds && pivot.dnfIds.includes(c.driverId)) {
          altStep = 0;
        }
      }

      cumAlt += altStep;

      const node: ScenarioPointNode = {
        round: item.round,
        raceName: item.raceName,
        isProjected: pivot ? item.round >= pivot.round : false,
        points: pivot && item.round >= pivot.round ? altStep : step,
        cumulative: pivot && item.round >= pivot.round ? cumAlt : cumReal,
        gapToLeader: 0,
        position: 1
      };

      if (!node.isProjected) {
        realNodes.push(node);
      } else {
        projectedNodes.push(node);
      }
    });

    const isWinner = c.driverId === originalLeader.driverId;

    return {
      id: c.driverId,
      name: c.fullName,
      shortName: c.code || c.fullName.split(' ').pop() || '',
      constructorName: c.constructorName,
      color: '#' + (isWinner ? 'e10600' : '3b82f6'),
      isLeader: isWinner,
      realTotalPoints: c.points,
      projectedTotalPoints: cumAlt,
      realNodes,
      projectedNodes
    };
  });

  const sortedAlt = [...series].sort((a, b) => b.projectedTotalPoints - a.projectedTotalPoints);
  const altChamp = sortedAlt[0];
  const altRunnerUp = sortedAlt[1] || altChamp;
  const gap = altChamp.projectedTotalPoints - altRunnerUp.projectedTotalPoints;
  const isHistoryChanged = altChamp.id !== originalLeader.driverId;

  let title = `Analisi Storica Stagione ${season}`;
  let summary = `Classifica finale ufficiale: ${originalLeader.fullName} Campione del Mondo con ${originalLeader.points} punti (+${originalLeader.points - originalSecond.points} su ${originalSecond.fullName}).`;

  if (pivot) {
    title = pivot.title;
    if (isHistoryChanged) {
      summary = `Storia Riscritta: Con questo cambio, ${altChamp.name} avrebbe vinto il Campionato del Mondo ${season} con ${altChamp.projectedTotalPoints} punti (+${gap} su ${altRunnerUp.name})!`;
    } else {
      summary = `Anche con questo cambio, ${altChamp.name} avrebbe mantenuto il titolo mondiale, chiudendo a quota ${altChamp.projectedTotalPoints} punti (+${gap} su ${altRunnerUp.name}).`;
    }
  }

  return {
    mode: 'historical-what-if',
    season,
    title,
    summary,
    winnerName: altChamp.name,
    winnerColor: altChamp.color,
    winnerPoints: altChamp.projectedTotalPoints,
    runnerUpName: altRunnerUp.name,
    runnerUpPoints: altRunnerUp.projectedTotalPoints,
    gap,
    isHistoryChanged,
    series,
    roundsAxis
  };
}
