import { SeasonRoundPoints } from '../services/jolpica.service';

export interface ProgressionContenderInput {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  teamKey: string;
}

export interface ProgressionPointNode {
  roundIndex: number;
  round: number;
  raceName: string;
  locality: string;
  date: string;
  x: number;
  y: number;
  cumulative: number;
  gained: number;
}

export interface ProgressionSeries {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  dashed: boolean;
  totalPoints: number;
  pathD: string;
  nodes: ProgressionPointNode[];
}

export interface ProgressionRoundTick {
  index: number;
  round: number;
  x: number;
  hitLeft: number;
  hitWidth: number;
  label: string;
  raceName: string;
  locality: string;
  country: string;
  date: string;
  showAxisLabel: boolean;
}

export interface PointsProgressionChart {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  series: ProgressionSeries[];
  yTicks: { y: number; value: number; label: string }[];
  rounds: ProgressionRoundTick[];
}

const MARGIN = { left: 52, right: 24, top: 20, bottom: 36 };

function niceYStep(maxVal: number): number {
  if (maxVal <= 50) return 10;
  if (maxVal <= 120) return 25;
  if (maxVal <= 300) return 50;
  if (maxVal <= 600) return 100;
  return 150;
}

export function buildPointsProgressionChart(
  roundData: SeasonRoundPoints[],
  contenders: ProgressionContenderInput[],
  mode: 'drivers' | 'constructors',
  width = 960,
  height = 340
): PointsProgressionChart | null {
  if (!roundData.length || !contenders.length) {
    return null;
  }

  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = height - MARGIN.bottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const nRounds = roundData.length;
  const xForIndex = (i: number): number => {
    if (nRounds === 1) return plotLeft + plotWidth / 2;
    return plotLeft + (i / (nRounds - 1)) * plotWidth;
  };

  // Calcolo cumulativo grezzo per determinare il massimo sull'asse Y
  const seenTeams = new Map<string, number>();
  let rawMaxPoints = 10;

  const rawSeries = contenders.map(c => {
    const teamCount = (seenTeams.get(c.teamKey) ?? 0) + 1;
    seenTeams.set(c.teamKey, teamCount);

    let running = 0;
    const values = roundData.map(r => {
      const gained = mode === 'drivers'
        ? (r.driverPoints[c.id] ?? 0)
        : (r.constructorPoints[c.id] ?? 0);
      running = Math.round((running + gained) * 100) / 100;
      return { gained, cumulative: running };
    });

    if (running > rawMaxPoints) {
      rawMaxPoints = running;
    }

    return {
      contender: c,
      dashed: teamCount > 1,
      values,
      totalPoints: running
    };
  });

  const step = niceYStep(rawMaxPoints);
  const yMax = Math.ceil(rawMaxPoints / step) * step || step;

  const yForPoints = (pts: number): number => {
    return plotBottom - (pts / yMax) * plotHeight;
  };

  const yTicks: { y: number; value: number; label: string }[] = [];
  for (let v = 0; v <= yMax; v += step) {
    yTicks.push({
      y: yForPoints(v),
      value: v,
      label: `${v}`
    });
  }

  const series: ProgressionSeries[] = rawSeries.map(item => {
    const hexColor = item.contender.color.startsWith('#')
      ? item.contender.color
      : `#${item.contender.color}`;

    const nodes: ProgressionPointNode[] = item.values.map((val, idx) => {
      const r = roundData[idx];
      return {
        roundIndex: idx,
        round: r.round,
        raceName: r.raceName,
        locality: r.locality,
        date: r.date,
        x: xForIndex(idx),
        y: yForPoints(val.cumulative),
        cumulative: val.cumulative,
        gained: val.gained
      };
    });

    const pathD = nodes
      .map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`)
      .join(' ');

    return {
      id: item.contender.id,
      label: item.contender.label,
      shortLabel: item.contender.shortLabel,
      color: hexColor,
      dashed: item.dashed,
      totalPoints: item.totalPoints,
      pathD,
      nodes
    };
  });

  const labelStep = nRounds > 20 ? 2 : 1;
  const colGap = nRounds > 1 ? plotWidth / (nRounds - 1) : plotWidth;

  const rounds: ProgressionRoundTick[] = roundData.map((r, idx) => {
    const cx = xForIndex(idx);
    const hitLeft = idx === 0 ? plotLeft : cx - colGap / 2;
    const hitRight = idx === nRounds - 1 ? plotRight : cx + colGap / 2;
    const showAxisLabel = idx === 0 || idx === nRounds - 1 || idx % labelStep === 0;

    return {
      index: idx,
      round: r.round,
      x: cx,
      hitLeft,
      hitWidth: Math.max(12, hitRight - hitLeft),
      label: `R${r.round}`,
      raceName: r.raceName.replace(/Grand Prix/i, 'GP'),
      locality: r.locality,
      country: r.country,
      date: r.date,
      showAxisLabel
    };
  });

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    series,
    yTicks,
    rounds
  };
}
