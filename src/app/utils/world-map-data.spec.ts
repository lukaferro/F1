import { describe, it, expect } from 'vitest';
import {
  geoToSvg,
  getCircuitDisplayCoords,
  generateFlightPath,
  MACRO_REGIONS,
  CONTINENT_PATHS,
  GRID_LINES,
  GLOBAL_VIEW_OFFSETS,
  CircuitMapTarget
} from './world-map-data';

describe('world-map-data', () => {
  it('correctly projects geographic coordinates onto 1000x500 equirectangular plane', () => {
    // Equatore e meridiano zero (0, 0) -> centro esatto (500, 250)
    const center = geoToSvg(0, 0);
    expect(center.x).toBe(500);
    expect(center.y).toBe(250);

    // Polo Nord (90, 0) -> y = 0
    const northPole = geoToSvg(90, 0);
    expect(northPole.y).toBe(0);

    // Polo Sud (-90, 0) -> y = 500
    const southPole = geoToSvg(-90, 0);
    expect(southPole.y).toBe(500);

    // Coordinate note Monza (lat ~45.61, lng ~9.28)
    const monza = geoToSvg(45.6156, 9.2811);
    expect(monza.x).toBeCloseTo(525.8, 1);
    expect(monza.y).toBeCloseTo(123.3, 1);
  });

  it('applies calibrated decluttering offsets in global view for close tracks like Monza, Imola, Monaco', () => {
    const monza = { id: 'monza', latitude: 45.6156, longitude: 9.2811 };
    const globalCoords = getCircuitDisplayCoords(monza, true);
    const regionalCoords = getCircuitDisplayCoords(monza, false);

    expect(globalCoords.isOffset).toBe(true);
    expect(globalCoords.x).toBeCloseTo(525.8 + GLOBAL_VIEW_OFFSETS['monza'].dx, 1);
    expect(globalCoords.y).toBeCloseTo(123.3 + GLOBAL_VIEW_OFFSETS['monza'].dy, 1);

    // Nella vista regionale l'offset è disattivato per mostrare la posizione reale
    expect(regionalCoords.isOffset).toBe(false);
    expect(regionalCoords.x).toBe(globalCoords.trueX);
    expect(regionalCoords.y).toBe(globalCoords.trueY);
  });

  it('defines all 5 macro regions with valid viewboxes and icons', () => {
    expect(MACRO_REGIONS.length).toBe(5);
    const ids = MACRO_REGIONS.map(m => m.id);
    expect(ids).toContain('world');
    expect(ids).toContain('europe');
    expect(ids).toContain('americas');
    expect(ids).toContain('middle_east');
    expect(ids).toContain('asia_pacific');

    MACRO_REGIONS.forEach(region => {
      expect(region.viewBox.split(' ').length).toBe(4);
      expect(region.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(region.icon).toContain('pi');
    });
  });

  it('contains continent SVG vector paths and grid lines', () => {
    expect(CONTINENT_PATHS.length).toBeGreaterThanOrEqual(8);
    CONTINENT_PATHS.forEach(c => {
      expect(c.id).toBeTruthy();
      expect(c.d).toContain('M');
      expect(c.d).toContain('Z');
    });

    expect(GRID_LINES.length).toBe(4);
  });

  it('generates connected flight path across scheduled rounds', () => {
    const circuits: CircuitMapTarget[] = [
      { id: 'bahrain', name: 'Bahrain', latitude: 26.03, longitude: 50.51, round_number: 1 },
      { id: 'jeddah', name: 'Jeddah', latitude: 21.63, longitude: 39.10, round_number: 2 },
      { id: 'melbourne', name: 'Melbourne', latitude: -37.85, longitude: 144.97, round_number: 3 }
    ];

    const path = generateFlightPath(circuits);
    expect(path).toContain('M');
    expect(path).toContain('Q');
  });

  it('returns empty flight path when fewer than 2 valid circuits are given', () => {
    expect(generateFlightPath([])).toBe('');
    expect(generateFlightPath([{ id: 'monza', name: 'Monza' }])).toBe('');
  });
});
