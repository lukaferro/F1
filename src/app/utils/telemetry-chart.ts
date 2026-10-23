import { CarTelemetryPoint, LapData, Stint } from '../services/openf1-service';

export interface TelemetryDriverInput {
  driverNumber: number;
  name: string;
  shortName: string;
  teamName: string;
  color: string; // hex con o senza '#'
}

export interface TyreCompoundInfo {
  compound: string;       // 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' | 'unknown'
  compoundLabel: string;  // 'Soft' | 'Medium' | 'Hard' | 'Intermedie' | 'Da bagnato' | 'N/D'
  compoundShort: string;  // 'S' | 'M' | 'H' | 'I' | 'W' | '?'
  compoundColor: string;  // hex con '#'
  tyreAge: number;
}

export interface DriverLapSummary {
  lapNumber: number;
  duration: number;
  formattedTime: string;
  s1: string;
  s2: string;
  s3: string;
  s1Val: number | null;
  s2Val: number | null;
  s3Val: number | null;
  speedTrap: number | null;
  tyre: TyreCompoundInfo;
}

export interface SectorComparisonItem {
  sector: 'S1' | 'S2' | 'S3';
  timeA: string;
  timeB: string;
  deltaLabel: string;
  faster: 'A' | 'B' | 'equal' | null;
}

export interface LapNodePoint {
  lapNumber: number;
  x: number;
  y: number;
  duration: number;
  formattedTime: string;
  tyre: TyreCompoundInfo;
  isPitOut: boolean;
  isFastest: boolean;
}

export interface LapComparisonRow {
  lapNumber: number;
  x: number;
  hitLeft: number;
  hitWidth: number;
  showAxisLabel: boolean;
  a: {
    duration: number | null;
    formattedTime: string;
    s1: string;
    s2: string;
    s3: string;
    speedTrap: number | null;
    tyre: TyreCompoundInfo;
    isPitOut: boolean;
    isOutlier: boolean;
  } | null;
  b: {
    duration: number | null;
    formattedTime: string;
    s1: string;
    s2: string;
    s3: string;
    speedTrap: number | null;
    tyre: TyreCompoundInfo;
    isPitOut: boolean;
    isOutlier: boolean;
  } | null;
  deltaSeconds: number | null; // negativo = A più veloce, positivo = B più veloce
  deltaLabel: string;
  faster: 'A' | 'B' | 'equal' | null;
}

export interface LapComparisonChart {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  driverA: TelemetryDriverInput & { colorHex: string; dashed: boolean };
  driverB: TelemetryDriverInput & { colorHex: string; dashed: boolean };
  pathA: string;
  pathB: string;
  nodesA: LapNodePoint[];
  nodesB: LapNodePoint[];
  yTicks: { y: number; value: number; label: string }[];
  rows: LapComparisonRow[];
  bestLapA: DriverLapSummary | null;
  bestLapB: DriverLapSummary | null;
  bestLapDeltaLabel: string;
  fasterBestLap: 'A' | 'B' | 'equal' | null;
  avgPaceFormattedA: string;
  avgPaceFormattedB: string;
  avgPaceDeltaLabel: string;
  fasterAvgPace: 'A' | 'B' | 'equal' | null;
  topSpeedA: number | null;
  topSpeedB: number | null;
  sectors: SectorComparisonItem[];
  totalLaps: number;
  outlierCount: number;
}

export interface TelemetryLapWindow {
  lapNumber: number;
  duration: number;
  formattedTime: string;
  startIso: string;
  endIso: string;
}

export interface TelemetryAlignedSample {
  index: number;
  pct: number; // 0..100
  x: number;
  hitLeft: number;
  hitWidth: number;
  a: {
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    rpm: number;
    drsOpen: boolean;
    ySpeed: number;
    yThrottle: number;
    yBrake: number;
    yGear: number;
  };
  b: {
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    rpm: number;
    drsOpen: boolean;
    ySpeed: number;
    yThrottle: number;
    yBrake: number;
    yGear: number;
  };
  speedDelta: number; // speedA - speedB
}

export interface DrsZoneSegment {
  x1: number;
  x2: number;
  width: number;
}

export interface TelemetryComparisonChart {
  width: number;
  plotLeft: number;
  plotRight: number;
  driverA: TelemetryDriverInput & { colorHex: string; dashed: boolean };
  driverB: TelemetryDriverInput & { colorHex: string; dashed: boolean };
  speedChannel: {
    height: number;
    plotTop: number;
    plotBottom: number;
    pathA: string;
    pathB: string;
    yTicks: { y: number; label: string }[];
  };
  throttleChannel: {
    height: number;
    plotTop: number;
    plotBottom: number;
    pathA: string;
    pathB: string;
    yTicks: { y: number; label: string }[];
  };
  brakeChannel: {
    height: number;
    plotTop: number;
    plotBottom: number;
    pathA: string;
    pathB: string;
    yTicks: { y: number; label: string }[];
  };
  gearChannel: {
    height: number;
    plotTop: number;
    plotBottom: number;
    pathA: string;
    pathB: string;
    yTicks: { y: number; label: string }[];
    drsSegmentsA: DrsZoneSegment[];
    drsSegmentsB: DrsZoneSegment[];
  };
  xTicks: { x: number; label: string }[];
  samples: TelemetryAlignedSample[];
  kpis: {
    maxSpeedA: number;
    maxSpeedB: number;
    fullThrottlePctA: number;
    fullThrottlePctB: number;
    brakingPctA: number;
    brakingPctB: number;
    drsActivePctA: number;
    drsActivePctB: number;
    topRpmA: number;
    topRpmB: number;
  };
}

const COMPOUND_META: Record<string, { label: string; short: string; color: string }> = {
  soft: { label: 'Soft', short: 'S', color: '#e8002d' },
  medium: { label: 'Medium', short: 'M', color: '#ffd12e' },
  hard: { label: 'Hard', short: 'H', color: '#f0f0ec' },
  intermediate: { label: 'Intermedie', short: 'I', color: '#43b02a' },
  wet: { label: 'Da bagnato', short: 'W', color: '#0067ad' }
};

function normalizeHexColor(raw: string): string {
  const clean = (raw || '').replace('#', '').trim();
  if (!clean) return '#e10600';
  return `#${clean.toUpperCase()}`;
}

export function resolveDistinctDriverStyles(
  driverA: TelemetryDriverInput,
  driverB: TelemetryDriverInput
): {
  a: TelemetryDriverInput & { colorHex: string; dashed: boolean };
  b: TelemetryDriverInput & { colorHex: string; dashed: boolean };
} {
  const colorA = normalizeHexColor(driverA.color);
  let colorB = normalizeHexColor(driverB.color);
  let dashedB = false;

  if (colorA.toLowerCase() === colorB.toLowerCase()) {
    dashedB = true;
    // Se i due piloti sono compagni di squadra, usiamo una tinta ad alto contrasto per il secondo
    colorB = colorA.toLowerCase() === '#38bdf8' ? '#fbbf24' : '#38bdf8';
  }

  return {
    a: { ...driverA, colorHex: colorA, dashed: false },
    b: { ...driverB, colorHex: colorB, dashed: dashedB }
  };
}

export function formatLapDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }
  const mins = Math.floor(seconds / 60);
  const rem = (seconds - mins * 60).toFixed(3).padStart(6, '0');
  return mins > 0 ? `${mins}:${rem}` : `${rem}s`;
}

export function formatAxisLapTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const rem = (seconds - mins * 60).toFixed(1).padStart(4, '0');
  return mins > 0 ? `${mins}:${rem}` : `${rem}s`;
}

export function formatSectorTime(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }
  return `${seconds.toFixed(3)}s`;
}

export function resolveTyreForLap(stints: Stint[], driverNumber: number, lapNumber: number): TyreCompoundInfo {
  const driverStints = stints
    .filter(s => s.driver_number === driverNumber)
    .sort((a, b) => a.stint_number - b.stint_number);

  const matched = driverStints.find(s => {
    const start = s.lap_start ?? 1;
    const end = s.lap_end ?? start;
    return lapNumber >= start && lapNumber <= end;
  });

  if (!matched) {
    return {
      compound: 'unknown',
      compoundLabel: 'N/D',
      compoundShort: '?',
      compoundColor: '#71717a',
      tyreAge: 0
    };
  }

  const key = (matched.compound || 'unknown').toLowerCase();
  const meta = COMPOUND_META[key] ?? {
    label: matched.compound || 'N/D',
    short: (matched.compound || '?').charAt(0).toUpperCase(),
    color: '#71717a'
  };
  const ageAtStart = matched.tyre_age_at_start ?? 0;
  const startLap = matched.lap_start ?? 1;

  return {
    compound: COMPOUND_META[key] ? key : 'unknown',
    compoundLabel: meta.label,
    compoundShort: meta.short,
    compoundColor: meta.color,
    tyreAge: Math.max(1, ageAtStart + (lapNumber - startLap) + 1)
  };
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (!points.length) return '';
  return points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function maxDriverSpeed(laps: LapData[]): number | null {
  let maxVal = 0;
  for (const l of laps) {
    for (const s of [l.st_speed, l.i1_speed, l.i2_speed]) {
      if (typeof s === 'number' && Number.isFinite(s) && s > maxVal) {
        maxVal = s;
      }
    }
  }
  return maxVal > 0 ? Math.round(maxVal) : null;
}

function findBestLapSummary(laps: LapData[], stints: Stint[], driverNumber: number): DriverLapSummary | null {
  const valid = laps.filter(l => typeof l.lap_duration === 'number' && Number.isFinite(l.lap_duration) && l.lap_duration > 0);
  if (!valid.length) return null;

  const best = valid.reduce((min, cur) => (cur.lap_duration! < min.lap_duration! ? cur : min), valid[0]);
  return {
    lapNumber: best.lap_number,
    duration: best.lap_duration!,
    formattedTime: formatLapDuration(best.lap_duration),
    s1: formatSectorTime(best.duration_sector_1),
    s2: formatSectorTime(best.duration_sector_2),
    s3: formatSectorTime(best.duration_sector_3),
    s1Val: best.duration_sector_1,
    s2Val: best.duration_sector_2,
    s3Val: best.duration_sector_3,
    speedTrap: best.st_speed ?? best.i2_speed ?? best.i1_speed ?? null,
    tyre: resolveTyreForLap(stints, driverNumber, best.lap_number)
  };
}

/**
 * Determina la finestra temporale ISO (startIso, endIso) di un giro specifico
 * o, se non specificato, del giro più veloce del pilota per interrogare /v1/car_data.
 */
export function resolveLapTimeWindow(laps: LapData[], targetLapNumber?: number): TelemetryLapWindow | null {
  if (!laps.length) return null;
  const sorted = [...laps].sort((a, b) => a.lap_number - b.lap_number);

  let target: LapData | undefined;
  if (typeof targetLapNumber === 'number') {
    target = sorted.find(l => l.lap_number === targetLapNumber && typeof l.lap_duration === 'number' && l.lap_duration > 0);
  }

  if (!target) {
    // Preferiamo il giro più veloce dotato di date_start
    const validWithDate = sorted.filter(
      l => typeof l.lap_duration === 'number' && l.lap_duration > 0 && !!l.date_start
    );
    if (validWithDate.length) {
      target = validWithDate.reduce((min, cur) => (cur.lap_duration! < min.lap_duration! ? cur : min), validWithDate[0]);
    } else {
      const validAny = sorted.filter(l => typeof l.lap_duration === 'number' && l.lap_duration > 0);
      if (!validAny.length) return null;
      target = validAny.reduce((min, cur) => (cur.lap_duration! < min.lap_duration! ? cur : min), validAny[0]);
    }
  }

  const duration = target.lap_duration!;
  let startMs: number | null = target.date_start ? new Date(target.date_start).getTime() : null;

  // Se date_start manca sul giro target, proviamo a dedurlo dal giro successivo o precedente
  if (startMs === null || Number.isNaN(startMs)) {
    const idx = sorted.findIndex(l => l.lap_number === target!.lap_number);
    const nextLap = idx >= 0 ? sorted[idx + 1] : undefined;
    const prevLap = idx > 0 ? sorted[idx - 1] : undefined;

    if (nextLap?.date_start) {
      const nextMs = new Date(nextLap.date_start).getTime();
      if (!Number.isNaN(nextMs)) {
        startMs = nextMs - Math.round(duration * 1000);
      }
    } else if (prevLap?.date_start && typeof prevLap.lap_duration === 'number') {
      const prevMs = new Date(prevLap.date_start).getTime();
      if (!Number.isNaN(prevMs)) {
        startMs = prevMs + Math.round(prevLap.lap_duration * 1000);
      }
    }
  }

  if (startMs === null || Number.isNaN(startMs)) {
    return null;
  }

  const endMs = startMs + Math.ceil((duration + 0.35) * 1000);
  return {
    lapNumber: target.lap_number,
    duration,
    formattedTime: formatLapDuration(duration),
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString()
  };
}

export function buildLapComparisonChart(
  driverA: TelemetryDriverInput,
  lapsA: LapData[],
  driverB: TelemetryDriverInput,
  lapsB: LapData[],
  stints: Stint[],
  filterOutliers = true,
  width = 920,
  height = 310
): LapComparisonChart | null {
  const validA = lapsA.filter(l => typeof l.lap_duration === 'number' && Number.isFinite(l.lap_duration) && l.lap_duration > 0);
  const validB = lapsB.filter(l => typeof l.lap_duration === 'number' && Number.isFinite(l.lap_duration) && l.lap_duration > 0);

  if (!validA.length && !validB.length) {
    return null;
  }

  const styled = resolveDistinctDriverStyles(driverA, driverB);
  const bestLapA = findBestLapSummary(lapsA, stints, driverA.driverNumber);
  const bestLapB = findBestLapSummary(lapsB, stints, driverB.driverNumber);

  const sessionBestDuration = Math.min(
    bestLapA?.duration ?? Number.POSITIVE_INFINITY,
    bestLapB?.duration ?? Number.POSITIVE_INFINITY
  );
  // Soglia per escludere giri di rientro/uscita box o regime di Safety Car (oltre +12% dal miglior giro)
  const outlierThreshold = Number.isFinite(sessionBestDuration) ? sessionBestDuration * 1.12 : Number.POSITIVE_INFINITY;

  const isOutlierLap = (l: LapData): boolean => {
    if (!l.lap_duration || l.lap_duration <= 0) return true;
    return Boolean(l.is_pit_out_lap) || l.lap_duration > outlierThreshold;
  };

  const cleanDurationsA = validA.filter(l => !isOutlierLap(l)).map(l => l.lap_duration!);
  const cleanDurationsB = validB.filter(l => !isOutlierLap(l)).map(l => l.lap_duration!);

  const avgA = cleanDurationsA.length
    ? cleanDurationsA.reduce((s, v) => s + v, 0) / cleanDurationsA.length
    : (validA.length ? validA.reduce((s, v) => s + v.lap_duration!, 0) / validA.length : null);
  const avgB = cleanDurationsB.length
    ? cleanDurationsB.reduce((s, v) => s + v, 0) / cleanDurationsB.length
    : (validB.length ? validB.reduce((s, v) => s + v.lap_duration!, 0) / validB.length : null);

  let bestLapDeltaLabel = '-';
  let fasterBestLap: 'A' | 'B' | 'equal' | null = null;
  if (bestLapA && bestLapB) {
    const diff = bestLapA.duration - bestLapB.duration;
    if (Math.abs(diff) < 0.0005) {
      bestLapDeltaLabel = '0.000s (Pari)';
      fasterBestLap = 'equal';
    } else if (diff < 0) {
      bestLapDeltaLabel = `${diff.toFixed(3)}s (${driverA.shortName})`;
      fasterBestLap = 'A';
    } else {
      bestLapDeltaLabel = `-${diff.toFixed(3)}s (${driverB.shortName})`;
      fasterBestLap = 'B';
    }
  }

  let avgPaceDeltaLabel = '-';
  let fasterAvgPace: 'A' | 'B' | 'equal' | null = null;
  if (avgA !== null && avgB !== null) {
    const diff = avgA - avgB;
    if (Math.abs(diff) < 0.001) {
      avgPaceDeltaLabel = '0.000s';
      fasterAvgPace = 'equal';
    } else if (diff < 0) {
      avgPaceDeltaLabel = `${diff.toFixed(3)}s (${driverA.shortName})`;
      fasterAvgPace = 'A';
    } else {
      avgPaceDeltaLabel = `-${diff.toFixed(3)}s (${driverB.shortName})`;
      fasterAvgPace = 'B';
    }
  }

  const buildSectorItem = (
    sector: 'S1' | 'S2' | 'S3',
    valA: number | null | undefined,
    valB: number | null | undefined
  ): SectorComparisonItem => {
    const hasA = typeof valA === 'number' && valA > 0;
    const hasB = typeof valB === 'number' && valB > 0;
    let deltaLabel = '-';
    let faster: 'A' | 'B' | 'equal' | null = null;
    if (hasA && hasB) {
      const d = valA! - valB!;
      if (Math.abs(d) < 0.0005) {
        deltaLabel = '0.000s';
        faster = 'equal';
      } else if (d < 0) {
        deltaLabel = `${d.toFixed(3)}s`;
        faster = 'A';
      } else {
        deltaLabel = `+${d.toFixed(3)}s`;
        faster = 'B';
      }
    }
    return {
      sector,
      timeA: formatSectorTime(valA),
      timeB: formatSectorTime(valB),
      deltaLabel,
      faster
    };
  };

  const sectors: SectorComparisonItem[] = [
    buildSectorItem('S1', bestLapA?.s1Val, bestLapB?.s1Val),
    buildSectorItem('S2', bestLapA?.s2Val, bestLapB?.s2Val),
    buildSectorItem('S3', bestLapA?.s3Val, bestLapB?.s3Val)
  ];

  // Costruzione griglia giri (1 .. maxLap)
  const allLapNumbers = [
    ...lapsA.map(l => l.lap_number),
    ...lapsB.map(l => l.lap_number)
  ].filter(n => typeof n === 'number' && n >= 1);
  const maxLap = allLapNumbers.length ? Math.max(...allLapNumbers) : 1;

  const mapA = new Map<number, LapData>();
  for (const l of lapsA) {
    if (l.lap_number >= 1) mapA.set(l.lap_number, l);
  }
  const mapB = new Map<number, LapData>();
  for (const l of lapsB) {
    if (l.lap_number >= 1) mapB.set(l.lap_number, l);
  }

  let outlierCount = 0;
  for (const l of [...validA, ...validB]) {
    if (isOutlierLap(l)) outlierCount++;
  }

  // Determiniamo i giri da plottare sul grafico SVG
  const plottedValues: number[] = [];
  for (const l of [...validA, ...validB]) {
    if (!filterOutliers || !isOutlierLap(l)) {
      plottedValues.push(l.lap_duration!);
    }
  }
  // Se tutti i giri fossero stati filtrati (es. sessione bagnata/anomala), mostriamo tutti i giri validi
  const effectiveFilter = filterOutliers && plottedValues.length >= 2;
  const scaleValues = effectiveFilter
    ? plottedValues
    : [...validA, ...validB].map(l => l.lap_duration!);

  const rawMin = Math.min(...scaleValues);
  const rawMax = Math.max(...scaleValues);
  const span = Math.max(1.2, rawMax - rawMin);
  const yMin = Math.max(0, Math.floor((rawMin - span * 0.1) * 2) / 2);
  const yMax = Math.ceil((rawMax + span * 0.1) * 2) / 2;

  const plotLeft = 64;
  const plotRight = width - 22;
  const plotTop = 18;
  const plotBottom = height - 34;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const xForLap = (lapNum: number): number => {
    if (maxLap <= 1) return plotLeft + plotWidth / 2;
    return plotLeft + ((lapNum - 1) / (maxLap - 1)) * plotWidth;
  };

  // Asse Y: tempi più bassi (giri più veloci) in basso, tempi più alti in alto
  const yForDuration = (sec: number): number => {
    const clamped = Math.max(yMin, Math.min(yMax, sec));
    return plotBottom - ((clamped - yMin) / Math.max(0.5, yMax - yMin)) * plotHeight;
  };

  const tickCount = 5;
  const yTicks: { y: number; value: number; label: string }[] = [];
  for (let i = 0; i <= tickCount; i++) {
    const val = yMin + ((yMax - yMin) * i) / tickCount;
    yTicks.push({
      y: yForDuration(val),
      value: val,
      label: formatAxisLapTime(val)
    });
  }

  const nodesA: LapNodePoint[] = [];
  const nodesB: LapNodePoint[] = [];
  const rows: LapComparisonRow[] = [];

  const labelStep = maxLap > 40 ? 5 : maxLap > 20 ? 2 : 1;
  const colGap = maxLap > 1 ? plotWidth / (maxLap - 1) : plotWidth;

  for (let lapNum = 1; lapNum <= maxLap; lapNum++) {
    const lA = mapA.get(lapNum);
    const lB = mapB.get(lapNum);
    const tyreA = resolveTyreForLap(stints, driverA.driverNumber, lapNum);
    const tyreB = resolveTyreForLap(stints, driverB.driverNumber, lapNum);

    const durA = lA && typeof lA.lap_duration === 'number' && lA.lap_duration > 0 ? lA.lap_duration : null;
    const durB = lB && typeof lB.lap_duration === 'number' && lB.lap_duration > 0 ? lB.lap_duration : null;

    const outA = lA ? isOutlierLap(lA) : false;
    const outB = lB ? isOutlierLap(lB) : false;

    const cx = xForLap(lapNum);

    if (durA !== null && (!effectiveFilter || !outA)) {
      nodesA.push({
        lapNumber: lapNum,
        x: cx,
        y: yForDuration(durA),
        duration: durA,
        formattedTime: formatLapDuration(durA),
        tyre: tyreA,
        isPitOut: Boolean(lA?.is_pit_out_lap),
        isFastest: bestLapA?.lapNumber === lapNum
      });
    }

    if (durB !== null && (!effectiveFilter || !outB)) {
      nodesB.push({
        lapNumber: lapNum,
        x: cx,
        y: yForDuration(durB),
        duration: durB,
        formattedTime: formatLapDuration(durB),
        tyre: tyreB,
        isPitOut: Boolean(lB?.is_pit_out_lap),
        isFastest: bestLapB?.lapNumber === lapNum
      });
    }

    let deltaSeconds: number | null = null;
    let deltaLabel = '-';
    let faster: 'A' | 'B' | 'equal' | null = null;
    if (durA !== null && durB !== null) {
      deltaSeconds = durA - durB;
      if (Math.abs(deltaSeconds) < 0.0005) {
        deltaLabel = '0.000s';
        faster = 'equal';
      } else if (deltaSeconds < 0) {
        deltaLabel = `${deltaSeconds.toFixed(3)}s (${driverA.shortName})`;
        faster = 'A';
      } else {
        deltaLabel = `-${deltaSeconds.toFixed(3)}s (${driverB.shortName})`;
        faster = 'B';
      }
    }

    const hitLeft = lapNum === 1 ? plotLeft : cx - colGap / 2;
    const hitRight = lapNum === maxLap ? plotRight : cx + colGap / 2;
    const showAxisLabel = lapNum === 1 || lapNum === maxLap || lapNum % labelStep === 0;

    rows.push({
      lapNumber: lapNum,
      x: cx,
      hitLeft,
      hitWidth: Math.max(8, hitRight - hitLeft),
      showAxisLabel,
      a: lA
        ? {
            duration: durA,
            formattedTime: formatLapDuration(durA),
            s1: formatSectorTime(lA.duration_sector_1),
            s2: formatSectorTime(lA.duration_sector_2),
            s3: formatSectorTime(lA.duration_sector_3),
            speedTrap: lA.st_speed ?? lA.i2_speed ?? lA.i1_speed ?? null,
            tyre: tyreA,
            isPitOut: Boolean(lA.is_pit_out_lap),
            isOutlier: outA
          }
        : null,
      b: lB
        ? {
            duration: durB,
            formattedTime: formatLapDuration(durB),
            s1: formatSectorTime(lB.duration_sector_1),
            s2: formatSectorTime(lB.duration_sector_2),
            s3: formatSectorTime(lB.duration_sector_3),
            speedTrap: lB.st_speed ?? lB.i2_speed ?? lB.i1_speed ?? null,
            tyre: tyreB,
            isPitOut: Boolean(lB.is_pit_out_lap),
            isOutlier: outB
          }
        : null,
      deltaSeconds,
      deltaLabel,
      faster
    });
  }

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    driverA: styled.a,
    driverB: styled.b,
    pathA: buildSmoothPath(nodesA),
    pathB: buildSmoothPath(nodesB),
    nodesA,
    nodesB,
    yTicks,
    rows,
    bestLapA,
    bestLapB,
    bestLapDeltaLabel,
    fasterBestLap,
    avgPaceFormattedA: formatLapDuration(avgA),
    avgPaceFormattedB: formatLapDuration(avgB),
    avgPaceDeltaLabel,
    fasterAvgPace,
    topSpeedA: maxDriverSpeed(lapsA),
    topSpeedB: maxDriverSpeed(lapsB),
    sectors,
    totalLaps: maxLap,
    outlierCount
  };
}

interface NormalizedTelemetrySample {
  progress: number; // 0..1
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  drsOpen: boolean;
}

function isDrsActive(drsCode: number | null | undefined): boolean {
  // In OpenF1 / F1 live timing: 10, 12, 14 indicano DRS aperto
  return typeof drsCode === 'number' && drsCode >= 10;
}

function normalizeTelemetryStream(points: CarTelemetryPoint[]): NormalizedTelemetrySample[] {
  if (!points.length) return [];

  const sorted = [...points]
    .map(p => ({ p, ms: new Date(p.date).getTime() }))
    .filter(item => Number.isFinite(item.ms))
    .sort((a, b) => a.ms - b.ms);

  if (!sorted.length) return [];

  // Calcoliamo la distanza cumulativa integrando speed (m/s) * dt (s) per allineare le curve del tracciato
  const cumDist: number[] = [0];
  for (let i = 1; i < sorted.length; i++) {
    const dtSec = Math.max(0, Math.min(2, (sorted[i].ms - sorted[i - 1].ms) / 1000));
    const avgSpeedMs = ((sorted[i].p.speed + sorted[i - 1].p.speed) / 2) / 3.6;
    cumDist.push(cumDist[i - 1] + avgSpeedMs * dtSec);
  }

  const totalDist = cumDist[cumDist.length - 1];
  const tStart = sorted[0].ms;
  const tSpan = Math.max(1, sorted[sorted.length - 1].ms - tStart);

  return sorted.map((item, idx) => {
    const progress = totalDist > 100
      ? cumDist[idx] / totalDist
      : (item.ms - tStart) / tSpan;
    return {
      progress: Math.max(0, Math.min(1, progress)),
      speed: Math.max(0, item.p.speed ?? 0),
      throttle: Math.max(0, Math.min(100, item.p.throttle ?? 0)),
      brake: (item.p.brake ?? 0) > 0 ? Math.min(100, Math.max(1, item.p.brake)) : 0,
      gear: Math.max(0, Math.min(8, item.p.n_gear ?? 0)),
      rpm: Math.max(0, item.p.rpm ?? 0),
      drsOpen: isDrsActive(item.p.drs)
    };
  });
}

function sampleTelemetryAt(stream: NormalizedTelemetrySample[], targetProgress: number): NormalizedTelemetrySample {
  if (!stream.length) {
    return { progress: targetProgress, speed: 0, throttle: 0, brake: 0, gear: 0, rpm: 0, drsOpen: false };
  }
  if (targetProgress <= stream[0].progress) return stream[0];
  if (targetProgress >= stream[stream.length - 1].progress) return stream[stream.length - 1];

  // Ricerca binaria / lineare sul progresso
  let hi = 1;
  while (hi < stream.length - 1 && stream[hi].progress < targetProgress) {
    hi++;
  }
  const lo = hi - 1;
  const p0 = stream[lo];
  const p1 = stream[hi];
  const span = p1.progress - p0.progress;
  const t = span > 1e-6 ? (targetProgress - p0.progress) / span : 0;

  return {
    progress: targetProgress,
    speed: Math.round(p0.speed + (p1.speed - p0.speed) * t),
    throttle: Math.round(p0.throttle + (p1.throttle - p0.throttle) * t),
    brake: t < 0.5 ? p0.brake : p1.brake,
    gear: t < 0.5 ? p0.gear : p1.gear,
    rpm: Math.round(p0.rpm + (p1.rpm - p0.rpm) * t),
    drsOpen: t < 0.5 ? p0.drsOpen : p1.drsOpen
  };
}

function buildDrsSegments(samples: { x: number; drsOpen: boolean }[]): DrsZoneSegment[] {
  const segments: DrsZoneSegment[] = [];
  let currentStart: number | null = null;
  let lastX = 0;

  for (const s of samples) {
    if (s.drsOpen) {
      if (currentStart === null) currentStart = s.x;
      lastX = s.x;
    } else if (currentStart !== null) {
      segments.push({
        x1: currentStart,
        x2: lastX,
        width: Math.max(4, lastX - currentStart)
      });
      currentStart = null;
    }
  }
  if (currentStart !== null) {
    segments.push({
      x1: currentStart,
      x2: lastX,
      width: Math.max(4, lastX - currentStart)
    });
  }
  return segments;
}

export function buildTelemetryComparisonChart(
  driverA: TelemetryDriverInput,
  rawTelemetryA: CarTelemetryPoint[],
  driverB: TelemetryDriverInput,
  rawTelemetryB: CarTelemetryPoint[],
  width = 920,
  numSamples = 101
): TelemetryComparisonChart | null {
  const normA = normalizeTelemetryStream(rawTelemetryA);
  const normB = normalizeTelemetryStream(rawTelemetryB);

  if (!normA.length && !normB.length) {
    return null;
  }

  const styled = resolveDistinctDriverStyles(driverA, driverB);
  const plotLeft = 56;
  const plotRight = width - 20;
  const plotWidth = plotRight - plotLeft;

  // Dimensioni verticali dei 4 canali telemetrici
  const speedCfg = { height: 185, top: 14, bottom: 162 };
  const throttleCfg = { height: 115, top: 12, bottom: 96 };
  const brakeCfg = { height: 95, top: 12, bottom: 78 };
  const gearCfg = { height: 120, top: 22, bottom: 98 };

  const minSpeedAxis = 50;
  const maxSpeedAxis = 360;

  const ySpeedFor = (spd: number): number => {
    const clamped = Math.max(minSpeedAxis, Math.min(maxSpeedAxis, spd));
    return speedCfg.bottom - ((clamped - minSpeedAxis) / (maxSpeedAxis - minSpeedAxis)) * (speedCfg.bottom - speedCfg.top);
  };

  const yThrottleFor = (thr: number): number => {
    const clamped = Math.max(0, Math.min(100, thr));
    return throttleCfg.bottom - (clamped / 100) * (throttleCfg.bottom - throttleCfg.top);
  };

  const yBrakeFor = (brk: number): number => {
    const clamped = Math.max(0, Math.min(100, brk));
    return brakeCfg.bottom - (clamped / 100) * (brakeCfg.bottom - brakeCfg.top);
  };

  const yGearFor = (gear: number): number => {
    const clamped = Math.max(1, Math.min(8, gear || 1));
    return gearCfg.bottom - ((clamped - 1) / 7) * (gearCfg.bottom - gearCfg.top);
  };

  const samples: TelemetryAlignedSample[] = [];
  const colGap = numSamples > 1 ? plotWidth / (numSamples - 1) : plotWidth;

  for (let i = 0; i < numSamples; i++) {
    const progress = numSamples > 1 ? i / (numSamples - 1) : 0;
    const pct = Math.round(progress * 100);
    const x = plotLeft + progress * plotWidth;
    const sA = sampleTelemetryAt(normA, progress);
    const sB = sampleTelemetryAt(normB, progress);

    const hitLeft = i === 0 ? plotLeft : x - colGap / 2;
    const hitRight = i === numSamples - 1 ? plotRight : x + colGap / 2;

    samples.push({
      index: i,
      pct,
      x,
      hitLeft,
      hitWidth: Math.max(4, hitRight - hitLeft),
      a: {
        speed: sA.speed,
        throttle: sA.throttle,
        brake: sA.brake,
        gear: sA.gear,
        rpm: sA.rpm,
        drsOpen: sA.drsOpen,
        ySpeed: ySpeedFor(sA.speed),
        yThrottle: yThrottleFor(sA.throttle),
        yBrake: yBrakeFor(sA.brake),
        yGear: yGearFor(sA.gear)
      },
      b: {
        speed: sB.speed,
        throttle: sB.throttle,
        brake: sB.brake,
        gear: sB.gear,
        rpm: sB.rpm,
        drsOpen: sB.drsOpen,
        ySpeed: ySpeedFor(sB.speed),
        yThrottle: yThrottleFor(sB.throttle),
        yBrake: yBrakeFor(sB.brake),
        yGear: yGearFor(sB.gear)
      },
      speedDelta: sA.speed - sB.speed
    });
  }

  // Calcolo KPI telemetrici
  const maxSpeedA = normA.length ? Math.max(...normA.map(p => p.speed)) : 0;
  const maxSpeedB = normB.length ? Math.max(...normB.map(p => p.speed)) : 0;
  const topRpmA = normA.length ? Math.max(...normA.map(p => p.rpm)) : 0;
  const topRpmB = normB.length ? Math.max(...normB.map(p => p.rpm)) : 0;

  const fullThrottlePctA = samples.length
    ? Math.round((samples.filter(s => s.a.throttle >= 95).length / samples.length) * 100)
    : 0;
  const fullThrottlePctB = samples.length
    ? Math.round((samples.filter(s => s.b.throttle >= 95).length / samples.length) * 100)
    : 0;

  const brakingPctA = samples.length
    ? Math.round((samples.filter(s => s.a.brake > 0).length / samples.length) * 100)
    : 0;
  const brakingPctB = samples.length
    ? Math.round((samples.filter(s => s.b.brake > 0).length / samples.length) * 100)
    : 0;

  const drsActivePctA = samples.length
    ? Math.round((samples.filter(s => s.a.drsOpen).length / samples.length) * 100)
    : 0;
  const drsActivePctB = samples.length
    ? Math.round((samples.filter(s => s.b.drsOpen).length / samples.length) * 100)
    : 0;

  const xTicks = [0, 20, 40, 60, 80, 100].map(pct => ({
    x: plotLeft + (pct / 100) * plotWidth,
    label: `${pct}%`
  }));

  return {
    width,
    plotLeft,
    plotRight,
    driverA: styled.a,
    driverB: styled.b,
    speedChannel: {
      height: speedCfg.height,
      plotTop: speedCfg.top,
      plotBottom: speedCfg.bottom,
      pathA: normA.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.a.ySpeed }))) : '',
      pathB: normB.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.b.ySpeed }))) : '',
      yTicks: [100, 180, 260, 340].map(v => ({ y: ySpeedFor(v), label: `${v}` }))
    },
    throttleChannel: {
      height: throttleCfg.height,
      plotTop: throttleCfg.top,
      plotBottom: throttleCfg.bottom,
      pathA: normA.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.a.yThrottle }))) : '',
      pathB: normB.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.b.yThrottle }))) : '',
      yTicks: [0, 50, 100].map(v => ({ y: yThrottleFor(v), label: `${v}%` }))
    },
    brakeChannel: {
      height: brakeCfg.height,
      plotTop: brakeCfg.top,
      plotBottom: brakeCfg.bottom,
      pathA: normA.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.a.yBrake }))) : '',
      pathB: normB.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.b.yBrake }))) : '',
      yTicks: [
        { y: yBrakeFor(0), label: 'OFF' },
        { y: yBrakeFor(100), label: 'ON' }
      ]
    },
    gearChannel: {
      height: gearCfg.height,
      plotTop: gearCfg.top,
      plotBottom: gearCfg.bottom,
      pathA: normA.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.a.yGear }))) : '',
      pathB: normB.length ? buildSmoothPath(samples.map(s => ({ x: s.x, y: s.b.yGear }))) : '',
      yTicks: [2, 4, 6, 8].map(g => ({ y: yGearFor(g), label: `${g}ª` })),
      drsSegmentsA: buildDrsSegments(samples.map(s => ({ x: s.x, drsOpen: s.a.drsOpen }))),
      drsSegmentsB: buildDrsSegments(samples.map(s => ({ x: s.x, drsOpen: s.b.drsOpen })))
    },
    xTicks,
    samples,
    kpis: {
      maxSpeedA,
      maxSpeedB,
      fullThrottlePctA,
      fullThrottlePctB,
      brakingPctA,
      brakingPctB,
      drsActivePctA,
      drsActivePctB,
      topRpmA,
      topRpmB
    }
  };
}
