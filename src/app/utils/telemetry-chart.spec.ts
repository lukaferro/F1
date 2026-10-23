import {
  buildLapComparisonChart,
  buildTelemetryComparisonChart,
  resolveDistinctDriverStyles,
  resolveLapTimeWindow,
  resolveTyreForLap,
  TelemetryDriverInput
} from './telemetry-chart';
import { CarTelemetryPoint, LapData, Stint } from '../services/openf1-service';

describe('telemetry-chart utilities', () => {
  const driverVer: TelemetryDriverInput = {
    driverNumber: 1,
    name: 'M. Verstappen',
    shortName: 'VER',
    teamName: 'Red Bull Racing',
    color: '3671C6'
  };

  const driverLec: TelemetryDriverInput = {
    driverNumber: 16,
    name: 'C. Leclerc',
    shortName: 'LEC',
    teamName: 'Ferrari',
    color: 'E8002D'
  };

  const stints: Stint[] = [
    { compound: 'SOFT', driver_number: 1, lap_start: 1, lap_end: 3, meeting_key: 1229, session_key: 9472, stint_number: 1, tyre_age_at_start: 0 },
    { compound: 'HARD', driver_number: 16, lap_start: 1, lap_end: 3, meeting_key: 1229, session_key: 9472, stint_number: 1, tyre_age_at_start: 2 }
  ];

  const lapsVer: LapData[] = [
    { meeting_key: 1229, session_key: 9472, driver_number: 1, lap_number: 1, date_start: '2024-03-02T15:00:00.000Z', lap_duration: 94.5, duration_sector_1: 30.1, duration_sector_2: 41.0, duration_sector_3: 23.4, i1_speed: 240, i2_speed: 260, st_speed: 315, is_pit_out_lap: false },
    { meeting_key: 1229, session_key: 9472, driver_number: 1, lap_number: 2, date_start: '2024-03-02T15:01:34.500Z', lap_duration: 92.6, duration_sector_1: 29.5, duration_sector_2: 40.1, duration_sector_3: 23.0, i1_speed: 245, i2_speed: 268, st_speed: 322, is_pit_out_lap: false },
    { meeting_key: 1229, session_key: 9472, driver_number: 1, lap_number: 3, date_start: '2024-03-02T15:03:07.100Z', lap_duration: 115.0, duration_sector_1: 35.0, duration_sector_2: 50.0, duration_sector_3: 30.0, i1_speed: 210, i2_speed: 220, st_speed: 290, is_pit_out_lap: true }
  ];

  const lapsLec: LapData[] = [
    { meeting_key: 1229, session_key: 9472, driver_number: 16, lap_number: 1, date_start: '2024-03-02T15:00:00.000Z', lap_duration: 94.8, duration_sector_1: 30.2, duration_sector_2: 41.1, duration_sector_3: 23.5, i1_speed: 239, i2_speed: 259, st_speed: 318, is_pit_out_lap: false },
    { meeting_key: 1229, session_key: 9472, driver_number: 16, lap_number: 2, date_start: '2024-03-02T15:01:34.800Z', lap_duration: 93.1, duration_sector_1: 29.7, duration_sector_2: 40.3, duration_sector_3: 23.1, i1_speed: 243, i2_speed: 266, st_speed: 325, is_pit_out_lap: false },
    { meeting_key: 1229, session_key: 9472, driver_number: 16, lap_number: 3, date_start: '2024-03-02T15:03:07.900Z', lap_duration: 93.4, duration_sector_1: 29.8, duration_sector_2: 40.4, duration_sector_3: 23.2, i1_speed: 242, i2_speed: 265, st_speed: 320, is_pit_out_lap: false }
  ];

  it('resolves tyre compound and age for a given driver and lap', () => {
    const tyreVer = resolveTyreForLap(stints, 1, 2);
    expect(tyreVer.compound).toBe('soft');
    expect(tyreVer.compoundLabel).toBe('Soft');
    expect(tyreVer.tyreAge).toBe(2);

    const tyreLec = resolveTyreForLap(stints, 16, 2);
    expect(tyreLec.compound).toBe('hard');
    expect(tyreLec.compoundLabel).toBe('Hard');
    expect(tyreLec.tyreAge).toBe(4);
  });

  it('assigns a dashed style and distinct color when comparing teammates', () => {
    const teammate: TelemetryDriverInput = {
      driverNumber: 11,
      name: 'S. Perez',
      shortName: 'PER',
      teamName: 'Red Bull Racing',
      color: '3671C6'
    };
    const styled = resolveDistinctDriverStyles(driverVer, teammate);
    expect(styled.a.dashed).toBe(false);
    expect(styled.b.dashed).toBe(true);
    expect(styled.b.colorHex).not.toBe(styled.a.colorHex);
  });

  it('builds lap-by-lap comparison chart, best lap delta, and filters pit-out outliers', () => {
    const chart = buildLapComparisonChart(driverVer, lapsVer, driverLec, lapsLec, stints, true);
    expect(chart).toBeTruthy();
    expect(chart!.bestLapA?.lapNumber).toBe(2);
    expect(chart!.bestLapA?.formattedTime).toBe('1:32.600');
    expect(chart!.bestLapB?.lapNumber).toBe(2);
    expect(chart!.bestLapB?.formattedTime).toBe('1:33.100');
    expect(chart!.fasterBestLap).toBe('A');
    expect(chart!.bestLapDeltaLabel).toContain('-0.500s');
    expect(chart!.topSpeedA).toBe(322);
    expect(chart!.topSpeedB).toBe(325);
    // Il giro 3 di VER è pit-out / outlier (115s), quindi filtrato dai nodi SVG ma presente nelle righe ispettore
    expect(chart!.nodesA.length).toBe(2);
    expect(chart!.nodesB.length).toBe(3);
    expect(chart!.rows.length).toBe(3);
  });

  it('resolves fastest lap ISO time window for telemetry query', () => {
    const window = resolveLapTimeWindow(lapsVer);
    expect(window).toBeTruthy();
    expect(window!.lapNumber).toBe(2);
    expect(window!.startIso).toBe('2024-03-02T15:01:34.500Z');
  });

  it('builds aligned multi-channel telemetry comparison chart and KPIs', () => {
    const telA: CarTelemetryPoint[] = [
      { date: '2024-03-02T15:01:34.500Z', session_key: 9472, meeting_key: 1229, driver_number: 1, speed: 290, throttle: 100, brake: 0, n_gear: 8, rpm: 11500, drs: 12 },
      { date: '2024-03-02T15:02:15.000Z', session_key: 9472, meeting_key: 1229, driver_number: 1, speed: 110, throttle: 0, brake: 100, n_gear: 3, rpm: 8200, drs: 0 },
      { date: '2024-03-02T15:03:07.100Z', session_key: 9472, meeting_key: 1229, driver_number: 1, speed: 322, throttle: 100, brake: 0, n_gear: 8, rpm: 11800, drs: 12 }
    ];
    const telB: CarTelemetryPoint[] = [
      { date: '2024-03-02T15:01:34.800Z', session_key: 9472, meeting_key: 1229, driver_number: 16, speed: 285, throttle: 100, brake: 0, n_gear: 7, rpm: 11400, drs: 0 },
      { date: '2024-03-02T15:02:16.000Z', session_key: 9472, meeting_key: 1229, driver_number: 16, speed: 105, throttle: 10, brake: 100, n_gear: 2, rpm: 7900, drs: 0 },
      { date: '2024-03-02T15:03:07.900Z', session_key: 9472, meeting_key: 1229, driver_number: 16, speed: 325, throttle: 100, brake: 0, n_gear: 8, rpm: 11950, drs: 12 }
    ];

    const telChart = buildTelemetryComparisonChart(driverVer, telA, driverLec, telB, 920, 21);
    expect(telChart).toBeTruthy();
    expect(telChart!.samples.length).toBe(21);
    expect(telChart!.kpis.maxSpeedA).toBe(322);
    expect(telChart!.kpis.maxSpeedB).toBe(325);
    expect(telChart!.speedChannel.pathA).toContain('M ');
    expect(telChart!.gearChannel.drsSegmentsA.length).toBeGreaterThan(0);
  });
});
