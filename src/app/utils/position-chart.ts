// Geometria del grafico "Posizione finale" del dettaglio pilota (SVG disegnato nel template)

export interface ChartInput {
  season: number;
  position: number;
  color: string;
  inProgress: boolean;
}

export interface PositionChart {
  width: number;
  height: number;
  points: { x: number; y: number; season: number; position: number; color: string }[];
  segments: { x1: number; y1: number; x2: number; y2: number; dashed: boolean }[];
  yTicks: { y: number; label: string }[];
  xLabels: { x: number; label: string; minor: boolean }[];  // minor: nascosta sugli schermi stretti
  label: string;  // sintesi per aria-label
}

const MARGIN = { left: 40, right: 16, top: 16, bottom: 28 };
const MIN_BOTTOM_POSITION = 10;
// distanza minima tra due etichette degli anni quando il grafico è rimpicciolito (testo a 20px)
const NARROW_LABEL_GAP = 80;

/** null con meno di due stagioni: una linea con un solo punto non dice nulla */
export function buildPositionChart(input: ChartInput[], width = 640, height = 220): PositionChart | null {
  if (input.length < 2) return null;
  const seasons = [...input].sort((a, b) => a.season - b.season);

  const first = seasons[0].season;
  const last = seasons[seasons.length - 1].season;
  const bottom = Math.max(MIN_BOTTOM_POSITION, ...seasons.map(s => s.position));
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  // l'asse X segue gli anni, così una stagione saltata lascia un vuoto visibile
  const x = (season: number) => MARGIN.left + (season - first) / (last - first) * plotWidth;
  const y = (position: number) => MARGIN.top + (position - 1) / (bottom - 1) * plotHeight;

  const points = seasons.map(s => ({ x: x(s.season), y: y(s.position), season: s.season, position: s.position, color: s.color }));
  const segments = points.slice(1).map((p, i) => ({
    x1: points[i].x, y1: points[i].y, x2: p.x, y2: p.y,
    dashed: seasons[i + 1].inProgress
  }));

  const tickPositions = [1];
  for (let p = 5; p <= bottom; p += 5) tickPositions.push(p);
  const yTicks = tickPositions.map(p => ({ y: y(p), label: `P${p}` }));

  // etichette diradate nelle carriere lunghe, l'ultima stagione sempre visibile
  const step = points.length > 24 ? 5 : points.length > 12 ? 2 : 1;
  const lastIndex = points.length - 1;
  // un'etichetta troppo vicina all'ultima le si sovrapporrebbe: la si salta
  const xLabels = points
    .filter((_, i) => i === lastIndex || (i % step === 0 && (step === 1 || lastIndex - i >= step)))
    .map(p => ({ x: p.x, label: String(p.season), minor: false }));
  // sugli schermi stretti si tengono, partendo dall'ultima, solo le etichette abbastanza distanziate
  let lastShownX = Infinity;
  for (let i = xLabels.length - 1; i >= 0; i--) {
    xLabels[i].minor = lastShownX - xLabels[i].x < NARROW_LABEL_GAP;
    if (!xLabels[i].minor) lastShownX = xLabels[i].x;
  }

  const best = Math.min(...seasons.map(s => s.position));
  return {
    width, height, points, segments, yTicks, xLabels,
    label: `Posizione finale dal ${first} al ${last}, migliore: ${best}ª`
  };
}
