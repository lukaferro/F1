import { DriverStanding, SeasonScheduleItem } from '../services/jolpica.service';
import { SimulatorContender, SimulatorRaceRound } from '../models/championship-simulator';
import {
  computeConfiguredRoundPoints,
  getSeasonScoringRules
} from './championship-calculator';

export type FutureScenarioMode = 'trend' | 'leader-dominance' | 'chaser-comeback' | 'leader-dnf';

export interface HistoricalPivot {
  id: string;
  season: number;
  round: number;
  raceName: string;
  circuitName: string;
  title: string;
  description: string;
  winnerId: string;
  secondId?: string;
  /** Mappa indice posizione (0 = P1, 1 = P2, 2 = P3, 3 = P4...) -> driverId */
  positionsOverride?: Record<number, string>;
  dnfIds?: string[];
  fastestLapId?: string;
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

// --- Strutture del nuovo Grafico Interattivo Reale vs Simulato ---

export interface SimChartNode {
  roundIndex: number;
  round: number;
  raceName: string;
  x: number;
  simY: number;
  realY: number;
  simCumulative: number;
  realCumulative: number;
  simGained: number;
  realGained: number;
  deltaCumulative: number;
  isModifiedRound: boolean;
  isFutureRound: boolean;
}

export interface SimChartSeries {
  id: string;
  name: string;
  shortLabel: string;
  constructorName: string;
  color: string;
  isTeammateSecondary: boolean;
  hasDiverged: boolean;
  simTotal: number;
  realTotal: number;
  simPathD: string;
  realPathD: string;
  nodes: SimChartNode[];
}

export interface SimChartRoundTick {
  index: number;
  round: number;
  x: number;
  hitLeft: number;
  hitWidth: number;
  label: string;
  raceName: string;
  locality: string;
  isCompleted: boolean;
  isModified: boolean;
  showAxisLabel: boolean;
}

export interface SimulatorComparisonChart {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  yTicks: Array<{ y: number; value: number }>;
  rounds: SimChartRoundTick[];
  series: SimChartSeries[];
  firstFutureX: number | null;
}

/**
 * Palette ad alto contrasto per distinguere nettamente ogni contendente sul grafico scuro,
 * inclusi due compagni della stessa scuderia.
 */
const TEAM_PRIMARY_SECONDARY: Record<string, [string, string]> = {
  red_bull: ['#3B82F6', '#FACC15'],
  ferrari: ['#EF4444', '#FDE047'],
  mclaren: ['#FF8000', '#38BDF8'],
  mercedes: ['#10B981', '#C084FC'],
  aston_martin: ['#22C55E', '#A3E635'],
  williams: ['#06B6D4', '#F472B6'],
  alpine: ['#EC4899', '#60A5FA'],
  rb: ['#6366F1', '#2DD4BF'],
  haas: ['#F43F5E', '#E2E8F0'],
  sauber: ['#4ADE80', '#FB923C'],
  renault: ['#FACC15', '#38BDF8'],
  benetton: ['#38BDF8', '#FACC15'],
  lotus: ['#FACC15', '#10B981'],
  brabham: ['#3B82F6', '#FDE047'],
  tyrrell: ['#3B82F6', '#F472B6']
};

const HIGH_CONTRAST_FALLBACK = [
  '#EF4444', // Red
  '#38BDF8', // Sky Cyan
  '#FACC15', // Gold
  '#10B981', // Emerald
  '#FF8000', // Orange
  '#C084FC', // Violet
  '#F472B6', // Pink
  '#A3E635', // Lime
  '#60A5FA', // Blue
  '#2DD4BF', // Teal
  '#FB923C', // Amber
  '#E879F9'  // Fuchsia
];

/**
 * Assegna a ciascun contendente un colore garantito distinto ad alto contrasto
 */
export function assignDistinctSimulatorColors<T extends { id: string; constructorId: string; color?: string }>(
  items: T[],
  mode: 'drivers' | 'constructors'
): Map<string, { color: string; isSecondary: boolean }> {
  const result = new Map<string, { color: string; isSecondary: boolean }>();
  const teamCounter = new Map<string, number>();
  const usedColors = new Set<string>();

  items.forEach((item, idx) => {
    const teamKey = item.constructorId || item.id;
    const count = teamCounter.get(teamKey) ?? 0;
    teamCounter.set(teamKey, count + 1);

    const pair = TEAM_PRIMARY_SECONDARY[teamKey];
    let chosen: string | undefined;

    if (mode === 'drivers' && pair) {
      chosen = count === 0 ? pair[0] : pair[1];
    } else if (pair) {
      chosen = pair[0];
    }

    if (!chosen || usedColors.has(chosen.toUpperCase())) {
      const fallback = HIGH_CONTRAST_FALLBACK.find(c => !usedColors.has(c.toUpperCase()));
      chosen = fallback || HIGH_CONTRAST_FALLBACK[idx % HIGH_CONTRAST_FALLBACK.length];
    }

    usedColors.add(chosen.toUpperCase());
    result.set(item.id, { color: chosen, isSecondary: count > 0 });
  });

  return result;
}

/**
 * Costruisce il grafico comparativo Reale vs Simulato round per round
 */
export function buildSimulatorComparisonChart(
  rounds: SimulatorRaceRound[],
  contenders: SimulatorContender[],
  mode: 'drivers' | 'constructors',
  season: number,
  driverToConstructor: Map<string, string>,
  width = 920,
  height = 310
): SimulatorComparisonChart | null {
  if (!rounds.length || !contenders.length) return null;

  const rules = getSeasonScoringRules(season);
  const plotLeft = 52;
  const plotRight = width - 28;
  const plotTop = 22;
  const plotBottom = height - 38;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const nRounds = rounds.length;
  const xForIndex = (i: number): number => {
    if (nRounds === 1) return plotLeft + plotWidth / 2;
    return Math.round((plotLeft + (i / (nRounds - 1)) * plotWidth) * 10) / 10;
  };

  const colorMap = assignDistinctSimulatorColors(contenders, mode);

  // Calcola punti round per round (reali e simulati) per determinare max Y
  let maxVal = 25;

  const completedRounds = rounds.filter(r => r.isCompleted);
  const hasRealRoundData = completedRounds.some(r =>
    mode === 'drivers'
      ? Boolean(r.realDriverPoints && Object.keys(r.realDriverPoints).length > 0)
      : Boolean(r.realConstructorPoints && Object.keys(r.realConstructorPoints).length > 0)
  );

  // Pre-calcola i punti simulati configurati per i round modificati o futuri
  const configuredPointsByRound = new Map<number, Map<string, number>>();
  for (const r of rounds) {
    if (r.isModified || !r.isCompleted) {
      const { points } = computeConfiguredRoundPoints(r, rules, mode, driverToConstructor);
      configuredPointsByRound.set(r.round, points);
    }
  }

  interface RawContenderTrack {
    contender: SimulatorContender;
    color: string;
    isSecondary: boolean;
    hasDiverged: boolean;
    rawNodes: Array<{
      roundIndex: number;
      round: number;
      raceName: string;
      simCumulative: number;
      realCumulative: number;
      simGained: number;
      realGained: number;
      isModifiedRound: boolean;
      isFutureRound: boolean;
    }>;
  }

  const rawTracks: RawContenderTrack[] = contenders.map(c => {
    const colorInfo = colorMap.get(c.id) || { color: c.color || '#EF4444', isSecondary: false };
    let realCum = 0;
    let simCum = 0;
    let hasDiverged = false;

    const avgFallback = completedRounds.length > 0 ? c.currentPoints / completedRounds.length : 0;

    const rawNodes = rounds.map((r, idx) => {
      let realGained = 0;
      if (r.isCompleted) {
        if (hasRealRoundData) {
          const rec = mode === 'drivers' ? r.realDriverPoints : r.realConstructorPoints;
          realGained = rec?.[c.id] ?? 0;
        } else {
          // Fallback proporzionale se i dettagli round-by-round stanno ancora caricando
          const isLastCompleted = idx === completedRounds.length - 1;
          realGained = isLastCompleted
            ? Math.max(0, Math.round((c.currentPoints - realCum) * 10) / 10)
            : Math.round(avgFallback * 10) / 10;
        }
      }

      let simGained = realGained;
      if (r.isModified || !r.isCompleted) {
        const confMap = configuredPointsByRound.get(r.round);
        simGained = confMap?.get(c.id) ?? 0;
      }

      realCum = Math.round((realCum + realGained) * 10) / 10;
      simCum = Math.round((simCum + simGained) * 10) / 10;

      if (Math.abs(simCum - realCum) >= 0.5) {
        hasDiverged = true;
      }

      if (realCum > maxVal) maxVal = realCum;
      if (simCum > maxVal) maxVal = simCum;

      return {
        roundIndex: idx,
        round: r.round,
        raceName: r.raceName,
        simCumulative: simCum,
        realCumulative: realCum,
        simGained,
        realGained,
        isModifiedRound: Boolean(r.isModified),
        isFutureRound: !r.isCompleted
      };
    });

    return {
      contender: c,
      color: colorInfo.color,
      isSecondary: colorInfo.isSecondary,
      hasDiverged,
      rawNodes
    };
  });

  // Arrotonda maxVal a uno step pulito
  const step = maxVal <= 60 ? 15 : maxVal <= 150 ? 30 : maxVal <= 350 ? 50 : 100;
  const ceiling = Math.ceil(maxVal / step) * step;

  const yForValue = (val: number): number => {
    return Math.round((plotTop + (1 - val / ceiling) * plotHeight) * 10) / 10;
  };

  const yTicks: Array<{ y: number; value: number }> = [];
  for (let v = 0; v <= ceiling; v += step) {
    yTicks.push({ value: v, y: yForValue(v) });
  }

  const series: SimChartSeries[] = rawTracks.map(track => {
    const nodes: SimChartNode[] = track.rawNodes.map(rn => ({
      ...rn,
      x: xForIndex(rn.roundIndex),
      simY: yForValue(rn.simCumulative),
      realY: yForValue(rn.realCumulative),
      deltaCumulative: Math.round((rn.simCumulative - rn.realCumulative) * 10) / 10
    }));

    const simPathD = nodes
      .map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x} ${n.simY}`)
      .join(' ');

    const realPathD = nodes
      .filter(n => !n.isFutureRound)
      .map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x} ${n.realY}`)
      .join(' ');

    const lastNode = nodes[nodes.length - 1];

    return {
      id: track.contender.id,
      name: track.contender.name,
      shortLabel: track.contender.code || track.contender.name.split(' ').pop() || track.contender.name,
      constructorName: track.contender.constructorName,
      color: track.color,
      isTeammateSecondary: track.isSecondary,
      hasDiverged: track.hasDiverged,
      simTotal: lastNode ? lastNode.simCumulative : track.contender.totalPoints,
      realTotal: lastNode ? lastNode.realCumulative : track.contender.currentPoints,
      simPathD,
      realPathD,
      nodes
    };
  });

  const labelInterval = nRounds > 18 ? 2 : 1;
  const roundTicks: SimChartRoundTick[] = rounds.map((r, i) => {
    const x = xForIndex(i);
    const prevX = i === 0 ? plotLeft : xForIndex(i - 1);
    const nextX = i === nRounds - 1 ? plotRight : xForIndex(i + 1);
    const hitLeft = i === 0 ? plotLeft : (prevX + x) / 2;
    const hitRight = i === nRounds - 1 ? plotRight : (x + nextX) / 2;

    return {
      index: i,
      round: r.round,
      x,
      hitLeft,
      hitWidth: Math.max(12, hitRight - hitLeft),
      label: `R${r.round}`,
      raceName: r.raceName,
      locality: r.locality,
      isCompleted: r.isCompleted,
      isModified: Boolean(r.isModified),
      showAxisLabel: i === 0 || i === nRounds - 1 || i % labelInterval === 0 || Boolean(r.isModified)
    };
  });

  const firstFutureIdx = rounds.findIndex(r => !r.isCompleted);
  const firstFutureX = firstFutureIdx > 0 ? xForIndex(firstFutureIdx) : null;

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    yTicks,
    rounds: roundTicks,
    series,
    firstFutureX
  };
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
    description: 'Max Verstappen evita l\'incidente alla Copse con Hamilton e vince la gara davanti a Hamilton e Leclerc.',
    winnerId: 'max_verstappen',
    secondId: 'hamilton',
    positionsOverride: { 0: 'max_verstappen', 1: 'hamilton', 2: 'leclerc', 3: 'bottas', 4: 'norris' },
    fastestLapId: 'max_verstappen',
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
    positionsOverride: { 0: 'max_verstappen', 1: 'perez', 2: 'hamilton', 3: 'vettel', 4: 'gasly' },
    fastestLapId: 'max_verstappen',
    originalOutcome: 'Verstappen forò da leader (0 pt), Hamilton sbagliò alla ripartenza finendo 15° (0 pt).'
  },
  {
    id: '2021-abudhabi',
    season: 2021,
    round: 22,
    raceName: 'Abu Dhabi GP',
    circuitName: 'Yas Marina',
    title: 'Abu Dhabi 2021: La gara termina sotto Safety Car',
    description: 'La Safety Car non rientra all\'ultimo giro: Lewis Hamilton vince la gara e conquista l\'8° Titolo Mondiale.',
    winnerId: 'hamilton',
    secondId: 'max_verstappen',
    positionsOverride: { 0: 'hamilton', 1: 'max_verstappen', 2: 'sainz', 3: 'tsunoda', 4: 'gasly' },
    fastestLapId: 'max_verstappen',
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
    description: 'La Power Unit Mercedes regge fino al traguardo: Hamilton vince la gara davanti alle Red Bull con Rosberg 4°.',
    winnerId: 'hamilton',
    secondId: 'ricciardo',
    positionsOverride: { 0: 'hamilton', 1: 'ricciardo', 2: 'max_verstappen', 3: 'rosberg', 4: 'raikkonen' },
    originalOutcome: 'Hamilton si ritirò a 15 giri dalla fine (0 pt); Rosberg chiuse 3° (+15 pt) e vinse il Mondiale di 5 punti.'
  },

  // 2012
  {
    id: '2012-spa',
    season: 2012,
    round: 12,
    raceName: 'Belgian GP',
    circuitName: 'Spa-Francorchamps',
    title: 'Spa 2012: Alonso non viene coinvolto nella carambola al via',
    description: 'Fernando Alonso evita l\'incidente innescato da Grosjean alla Source e chiude 3° sul podio dietro a Button e Vettel.',
    winnerId: 'button',
    secondId: 'vettel',
    positionsOverride: { 0: 'button', 1: 'vettel', 2: 'alonso', 3: 'raikkonen', 4: 'hulkenberg' },
    originalOutcome: 'Alonso ritirato al via (0 pt); a fine anno Vettel vinse il Mondiale per soli 3 punti.'
  },
  {
    id: '2012-suzuka',
    season: 2012,
    round: 15,
    raceName: 'Japanese GP',
    circuitName: 'Suzuka',
    title: 'Suzuka 2012: Alonso non fora al via contro Raikkonen',
    description: 'Alonso non subisce la foratura alla prima curva e conclude 2° dietro a Vettel, ribaltando l\'esito del Mondiale.',
    winnerId: 'vettel',
    secondId: 'alonso',
    positionsOverride: { 0: 'vettel', 1: 'alonso', 2: 'massa', 3: 'kobayashi', 4: 'button' },
    originalOutcome: 'Alonso si insabbiò alla prima curva (0 pt); Vettel vinse gara e poi il titolo per 3 punti.'
  },

  // 2010
  {
    id: '2010-abudhabi',
    season: 2010,
    round: 19,
    raceName: 'Abu Dhabi GP',
    circuitName: 'Yas Marina',
    title: 'Abu Dhabi 2010: Alonso non resta bloccato dietro a Petrov e chiude 4°',
    description: 'Il muretto Ferrari non anticipa la sosta su Webber: Alonso resta in pista libera e taglia il traguardo 4°, laureandosi Campione.',
    winnerId: 'vettel',
    secondId: 'hamilton',
    positionsOverride: { 0: 'vettel', 1: 'hamilton', 2: 'button', 3: 'alonso', 4: 'rosberg', 5: 'kubica', 6: 'petrov' },
    originalOutcome: 'Alonso rimase bloccato 7° dietro a Petrov (6 pt); Vettel vinse il Mondiale per 4 punti.'
  },

  // 2008
  {
    id: '2008-singapore',
    season: 2008,
    round: 15,
    raceName: 'Singapore GP',
    circuitName: 'Marina Bay',
    title: 'Singapore 2008: Massa vince la gara senza il Crashgate',
    description: 'Senza l\'incidente di Piquet Jr e il problema al semaforo box, Felipe Massa domina la gara davanti a Hamilton.',
    winnerId: 'massa',
    secondId: 'hamilton',
    positionsOverride: { 0: 'massa', 1: 'hamilton', 2: 'raikkonen', 3: 'kubica', 4: 'kovalainen' },
    originalOutcome: 'Massa chiuse 13° dopo il bocchettone strappato (0 pt); Hamilton fu 3° (+6 pt) e vinse il titolo di 1 punto.'
  },
  {
    id: '2008-hungary',
    season: 2008,
    round: 11,
    raceName: 'Hungarian GP',
    circuitName: 'Hungaroring',
    title: 'Ungheria 2008: Il motore di Massa non cede a 3 giri dalla fine',
    description: 'Il motore Ferrari di Massa regge negli ultimi 3 giri: Felipe vince conquistando i 10 punti che gli valgono il Mondiale.',
    winnerId: 'massa',
    secondId: 'kovalainen',
    positionsOverride: { 0: 'massa', 1: 'kovalainen', 2: 'glock', 3: 'raikkonen', 4: 'alonso', 5: 'hamilton' },
    originalOutcome: 'Rottura del motore a 3 giri dal termine mentre era 1° (0 pt). Massa perse il Mondiale per 1 punto.'
  },

  // 2007
  {
    id: '2007-china',
    season: 2007,
    round: 16,
    raceName: 'Chinese GP',
    circuitName: 'Shanghai',
    title: 'Cina 2007: Hamilton non si insabbia nella corsia box',
    description: 'Hamilton rientra ai box prima che le gomme arrivino alle tele e chiude 3° a podio, laureandosi Campione da esordiente.',
    winnerId: 'raikkonen',
    secondId: 'alonso',
    positionsOverride: { 0: 'raikkonen', 1: 'alonso', 2: 'hamilton', 3: 'massa', 4: 'vettel' },
    originalOutcome: 'Hamilton si insabbiò nella ghiaia in ingresso pit-lane (0 pt); Raikkonen vinse il titolo per 1 punto.'
  },

  // 2006
  {
    id: '2006-suzuka',
    season: 2006,
    round: 17,
    raceName: 'Japanese GP',
    circuitName: 'Suzuka',
    title: 'Suzuka 2006: Il motore di Michael Schumacher non cede al comando',
    description: 'Il V8 Ferrari non cede al 37° giro: Michael Schumacher vince a Suzuka e si porta a +10 su Alonso prima del Brasile.',
    winnerId: 'michael_schumacher',
    secondId: 'alonso',
    positionsOverride: { 0: 'michael_schumacher', 1: 'alonso', 2: 'massa', 3: 'fisichella', 4: 'button' },
    originalOutcome: 'Rottura del motore per Schumacher da leader (0 pt); Alonso vinse andando a +10.'
  },

  // 1994
  {
    id: '1994-adelaide',
    season: 1994,
    round: 16,
    raceName: 'Australian GP',
    circuitName: 'Adelaide',
    title: 'Adelaide 1994: Damon Hill vince dopo il contatto con Schumacher',
    description: 'Il braccetto della sospensione Williams non si piega nel contatto con Schumacher: Hill prosegue e vince gara e Mondiale.',
    winnerId: 'hill',
    secondId: 'mansell',
    positionsOverride: { 0: 'hill', 1: 'mansell', 2: 'berger', 3: 'brundle', 4: 'barrichello' },
    dnfIds: ['michael_schumacher'],
    originalOutcome: 'Entrambi ritirati dopo la collisione; Schumacher Campione per 1 solo punto (92 a 91).'
  }
];

/**
 * Calcola la simulazione di scenario futuro (retrocompatibile con i test)
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

  interface Tracker {
    standing: DriverStanding;
    currentCum: number;
    nodes: ScenarioPointNode[];
  }

  const trackers: Tracker[] = contenders.map(c => {
    const nodes: ScenarioPointNode[] = [];
    const ptsPerRace = completedCount > 0 ? c.points / completedCount : 0;
    let cum = 0;

    schedule.forEach((item, idx) => {
      if (item.date < todayStr) {
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
        ptsLeader = rules.p1 + rules.fastestLap + sprintPtsLeader;
        ptsSecond = rules.p2 + sprintPtsSecond;
        ptsThird = rules.p3;
        break;
      case 'chaser-comeback':
        ptsSecond = rules.p1 + rules.fastestLap + sprintPtsLeader;
        ptsLeader = rules.p3 + sprintPtsSecond;
        ptsThird = rules.p2;
        break;
      case 'leader-dnf':
        if (futureIdx === 0) {
          ptsLeader = 0;
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

    const leaderNow = trackers.find(t => t.standing.driverId === leader.driverId)!.currentCum;
    const secondNow = trackers.find(t => t.standing.driverId === second.driverId)!.currentCum;
    const roundsLeftAfter = remainingRounds.length - 1 - futureIdx;
    const maxPossiblePointsLeft = roundsLeftAfter * (rules.p1 + rules.fastestLap + (rules.hasSprint ? rules.sprintP1 : 0));

    if (!clinchRoundNumber) {
      if (leaderNow - secondNow > maxPossiblePointsLeft || secondNow - leaderNow > maxPossiblePointsLeft) {
        clinchRoundNumber = r.round;
        clinchRoundName = r.raceName;
      }
    }
  });

  const sortedTrackers = [...trackers].sort((a, b) => b.currentCum - a.currentCum);
  const champ = sortedTrackers[0];
  const runnerUp = sortedTrackers[1] || champ;
  const finalGap = champ.currentCum - runnerUp.currentCum;

  const series: ScenarioContenderSeries[] = trackers.map(t => ({
    id: t.standing.driverId,
    name: t.standing.fullName,
    shortName: t.standing.code || t.standing.fullName.split(' ').pop() || '',
    constructorName: t.standing.constructorName,
    color: '#' + (t.standing.driverId === leader.driverId ? 'e10600' : 'ff8000'),
    isLeader: t.standing.driverId === leader.driverId,
    realTotalPoints: t.standing.points,
    projectedTotalPoints: t.currentCum,
    realNodes: t.nodes.filter(n => !n.isProjected),
    projectedNodes: t.nodes.filter(n => n.isProjected)
  }));

  return {
    mode: 'future-projections',
    season,
    title: 'Scenario Proiezione',
    summary: `${champ.standing.fullName} chiude con ${champ.currentCum} punti (+${finalGap} su ${runnerUp.standing.fullName}).`,
    winnerName: champ.standing.fullName,
    winnerColor: '#e10600',
    winnerPoints: champ.currentCum,
    runnerUpName: runnerUp.standing.fullName,
    runnerUpPoints: runnerUp.currentCum,
    gap: finalGap,
    isHistoryChanged: champ.standing.driverId !== leader.driverId,
    clinchRoundNumber,
    clinchRoundName,
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
