import { buildPositionChart, ChartInput } from './position-chart';

const point = (season: number, position: number, inProgress = false): ChartInput =>
  ({ season, position, color: '#00d2be', inProgress });
const consecutive = (count: number) => Array.from({ length: count }, (_, i) => point(2000 + i, 1 + (i % 5)));

describe('buildPositionChart', () => {
  it('returns null with fewer than two seasons', () => {
    expect(buildPositionChart([])).toBeNull();
    expect(buildPositionChart([point(2023, 5)])).toBeNull();
  });

  it('puts P1 at the top and the worst position at the bottom', () => {
    const chart = buildPositionChart([point(2007, 1), point(2008, 20)])!;
    expect(chart.points[0].y).toBe(16);
    expect(chart.points[1].y).toBe(220 - 28);
  });

  it('uses at least P10 as the bottom of the scale', () => {
    const chart = buildPositionChart([point(2007, 1), point(2008, 3)])!;
    expect(chart.yTicks.map(t => t.label)).toEqual(['P1', 'P5', 'P10']);
    expect(chart.points[1].y).toBeLessThan(220 - 28);
  });

  it('spaces seasons by year so gaps stay visible', () => {
    const chart = buildPositionChart([point(2020, 5), point(2022, 6), point(2023, 7)])!;
    const [a, b, c] = chart.points.map(p => p.x);
    expect(b - a).toBeCloseTo(2 * (c - b));
  });

  it('sorts seasons chronologically', () => {
    const chart = buildPositionChart([point(2026, 2), point(2010, 4), point(2015, 1)])!;
    expect(chart.points.map(p => p.season)).toEqual([2010, 2015, 2026]);
    expect(chart.points[0].x).toBe(40);
    expect(chart.points[2].x).toBe(640 - 16);
  });

  it('dashes the segment into the season in progress', () => {
    const chart = buildPositionChart([point(2024, 3), point(2025, 2), point(2026, 1, true)])!;
    expect(chart.segments.map(s => s.dashed)).toEqual([false, true]);
  });

  it('labels every season up to 12', () => {
    const chart = buildPositionChart(consecutive(12))!;
    expect(chart.xLabels.length).toBe(12);
  });

  it('thins x labels on long careers', () => {
    const twenty = buildPositionChart(consecutive(20))!.xLabels.map(l => l.label);
    // l'ultima stagione è sempre visibile; l'etichetta subito prima si toglie per non sovrapporsi
    expect(twenty).toEqual(['2000', '2002', '2004', '2006', '2008', '2010', '2012', '2014', '2016', '2019']);

    const twentySix = buildPositionChart(consecutive(26))!.xLabels.map(l => l.label);
    expect(twentySix).toEqual(['2000', '2005', '2010', '2015', '2020', '2025']);
  });

  it('marks the labels to hide on narrow screens so none overlap', () => {
    const labels = buildPositionChart(Array.from({ length: 12 }, (_, i) => point(2015 + i, 3)))!.xLabels;
    const shown = labels.filter(l => !l.minor);
    expect(shown.map(l => l.label)).toEqual(['2016', '2018', '2020', '2022', '2024', '2026']);
    shown.slice(1).forEach((l, i) => expect(l.x - shown[i].x).toBeGreaterThanOrEqual(80));
  });

  it('describes the chart for screen readers', () => {
    const chart = buildPositionChart([point(2026, 4), point(2007, 3), point(2008, 1)])!;
    expect(chart.label).toBe('Posizione finale dal 2007 al 2026, migliore: 1ª');
  });
});
