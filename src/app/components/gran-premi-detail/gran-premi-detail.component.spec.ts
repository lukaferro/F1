import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GranPremiDetailComponent } from './gran-premi-detail.component';
import { Openf1ServiceService, Stint, Result, Pit } from '../../services/openf1-service';
import { Meeting } from '../../models/meeting';

describe('GranPremiDetailComponent', () => {
  let component: GranPremiDetailComponent;
  let fixture: ComponentFixture<GranPremiDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranPremiDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GranPremiDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute prevMeeting and nextMeeting within the same season', async () => {
    const openF1 = TestBed.inject(Openf1ServiceService);
    const mockMeetings: Meeting[] = [
      {
        id: 1,
        meeting_key: 1201,
        meeting_code: 'BHR',
        meeting_name: 'Bahrain Grand Prix',
        meeting_official_name: 'Formula 1 Bahrain Grand Prix 2025',
        location: 'Sakhir',
        country_code: 'BHR',
        country_name: 'Bahrain',
        circuit_key: 3,
        circuit_short_name: 'Bahrain',
        date_start: '2025-03-02T15:00:00Z',
        gmt_offset: '+03:00',
        year: 2025
      },
      {
        id: 2,
        meeting_key: 1202,
        meeting_code: 'KSA',
        meeting_name: 'Saudi Arabian Grand Prix',
        meeting_official_name: 'Formula 1 Saudi Arabian Grand Prix 2025',
        location: 'Jeddah',
        country_code: 'KSA',
        country_name: 'Saudi Arabia',
        circuit_key: 149,
        circuit_short_name: 'Jeddah',
        date_start: '2025-03-09T17:00:00Z',
        gmt_offset: '+03:00',
        year: 2025
      },
      {
        id: 3,
        meeting_key: 1203,
        meeting_code: 'AUS',
        meeting_name: 'Australian Grand Prix',
        meeting_official_name: 'Formula 1 Australian Grand Prix 2025',
        location: 'Melbourne',
        country_code: 'AUS',
        country_name: 'Australia',
        circuit_key: 10,
        circuit_short_name: 'Melbourne',
        date_start: '2025-03-16T04:00:00Z',
        gmt_offset: '+11:00',
        year: 2025
      }
    ];

    vi.spyOn(openF1, 'getMeetings').mockResolvedValue(mockMeetings);
    vi.spyOn(openF1, 'getDrivers').mockResolvedValue([]);
    vi.spyOn(openF1, 'getSessions').mockResolvedValue([]);

    await component.loadMeeting(1202);
    fixture.detectChanges();

    expect(component.prevMeeting?.meeting_key).toBe(1201);
    expect(component.prevRoundNumber).toBe(1);
    expect(component.nextMeeting?.meeting_key).toBe(1203);
    expect(component.nextRoundNumber).toBe(3);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Gara precedente (Round 1)');
    expect(el.textContent).toContain('Bahrain Grand Prix');
    expect(el.textContent).toContain('Gara successiva (Round 3)');
    expect(el.textContent).toContain('Australian Grand Prix');
  });

  it('should compute grouped tyre stints, stop counts, and session stint summary', () => {
    component.drivers = [
      { driver_number: 16, broadcast_name: 'C LECLERC', full_name: 'Charles Leclerc', name_acronym: 'LEC', team_name: 'Ferrari', team_color: 'ED1131', first_name: 'Charles', last_name: 'Leclerc', country_code: 'MON' }
    ];

    const stints: Stint[] = [
      { compound: 'MEDIUM', driver_number: 16, lap_start: 1, lap_end: 15, meeting_key: 1201, session_key: 9001, stint_number: 1, tyre_age_at_start: 0 },
      { compound: 'HARD', driver_number: 16, lap_start: 16, lap_end: 53, meeting_key: 1201, session_key: 9001, stint_number: 2, tyre_age_at_start: 0 }
    ];
    const results: Result[] = [
      { driver_number: 16, broadcast_name: 'C LECLERC', position: 1, grid_position: 4, status: 'Finished', points: 25, team_name: 'Ferrari', team_color: 'ED1131' }
    ];

    const grouped = component.groupStints(stints, results);
    expect(grouped.length).toBe(1);
    expect(grouped[0].stopsCount).toBe(1);
    expect(grouped[0].pitLapsLabel).toBe('G15');
    expect(grouped[0].segments[0].laps).toBe(15);
    expect(grouped[0].segments[1].laps).toBe(38);

    const summary = component.computeStintSummary(grouped)!;
    expect(summary.mostUsedCompound).toBe('Hard');
    expect(summary.longestStintLaps).toBe(38);
    expect(summary.longestStintDriver).toBe('C. Leclerc');
  });

  it('should identify the fastest pit stop of the session', () => {
    const pits: Pit[] = [
      { date: '2025-03-02T15:30:00Z', driver_number: 1, lap_number: 18, meeting_key: 1201, pit_duration: 24.5, session_key: 9001 },
      { date: '2025-03-02T15:32:00Z', driver_number: 16, lap_number: 19, meeting_key: 1201, pit_duration: 21.8, session_key: 9001 }
    ];

    const fastest = component.computeFastestPit(pits);
    expect(fastest?.driver_number).toBe(16);
    expect(fastest?.pit_duration).toBe(21.8);
  });

  it('should load and compare lap-by-lap and fastest lap telemetry for two drivers in a session', async () => {
    const openF1 = TestBed.inject(Openf1ServiceService);
    component.drivers = [
      { driver_number: 1, broadcast_name: 'M VERSTAPPEN', full_name: 'Max Verstappen', name_acronym: 'VER', team_name: 'Red Bull Racing', team_color: '3671C6', first_name: 'Max', last_name: 'Verstappen', country_code: 'NED' },
      { driver_number: 16, broadcast_name: 'C LECLERC', full_name: 'Charles Leclerc', name_acronym: 'LEC', team_name: 'Ferrari', team_color: 'ED1131', first_name: 'Charles', last_name: 'Leclerc', country_code: 'MON' }
    ];

    vi.spyOn(openF1, 'getResults').mockResolvedValue([
      { driver_number: 1, broadcast_name: 'M VERSTAPPEN', position: 1, grid_position: 1, status: 'Finished', points: 25, team_name: 'Red Bull Racing', team_color: '3671C6' },
      { driver_number: 16, broadcast_name: 'C LECLERC', position: 2, grid_position: 2, status: 'Finished', points: 18, team_name: 'Ferrari', team_color: 'ED1131' }
    ]);
    vi.spyOn(openF1, 'getStints').mockResolvedValue([
      { compound: 'SOFT', driver_number: 1, lap_start: 1, lap_end: 10, meeting_key: 1201, session_key: 9001, stint_number: 1, tyre_age_at_start: 0 },
      { compound: 'MEDIUM', driver_number: 16, lap_start: 1, lap_end: 10, meeting_key: 1201, session_key: 9001, stint_number: 1, tyre_age_at_start: 0 }
    ]);
    vi.spyOn(openF1, 'getLaps').mockImplementation(async (_sk, driverNum) => [
      {
        meeting_key: 1201,
        session_key: 9001,
        driver_number: driverNum ?? 1,
        lap_number: 1,
        date_start: '2025-03-02T15:00:00.000Z',
        lap_duration: driverNum === 1 ? 92.4 : 92.9,
        duration_sector_1: 29.5,
        duration_sector_2: 40.0,
        duration_sector_3: driverNum === 1 ? 22.9 : 23.4,
        i1_speed: 245,
        i2_speed: 265,
        st_speed: driverNum === 1 ? 324 : 320,
        is_pit_out_lap: false
      }
    ]);
    vi.spyOn(openF1, 'getCarTelemetry').mockResolvedValue([
      { date: '2025-03-02T15:00:00.000Z', session_key: 9001, meeting_key: 1201, driver_number: 1, speed: 305, throttle: 100, brake: 0, n_gear: 8, rpm: 11600, drs: 12 },
      { date: '2025-03-02T15:01:32.000Z', session_key: 9001, meeting_key: 1201, driver_number: 1, speed: 324, throttle: 100, brake: 0, n_gear: 8, rpm: 11900, drs: 12 }
    ]);

    await component.setActiveTab(9001, 'telemetry');

    const telState = component.telemetryState[9001];
    expect(telState).toBeTruthy();
    expect(telState.driverANumber).toBe(1);
    expect(telState.driverBNumber).toBe(16);
    expect(telState.lapChart?.bestLapA?.formattedTime).toBe('1:32.400');
    expect(telState.lapChart?.bestLapB?.formattedTime).toBe('1:32.900');
    expect(telState.telemetryChart?.kpis.maxSpeedA).toBe(324);
  });

  it('should filter race control messages by category, flag, and driver', async () => {
    const openF1 = TestBed.inject(Openf1ServiceService);
    component.drivers = [
      { driver_number: 1, broadcast_name: 'M VERSTAPPEN', full_name: 'Max Verstappen', name_acronym: 'VER', team_name: 'Red Bull Racing', team_color: '3671C6', first_name: 'Max', last_name: 'Verstappen', country_code: 'NED' },
      { driver_number: 16, broadcast_name: 'C LECLERC', full_name: 'Charles Leclerc', name_acronym: 'LEC', team_name: 'Ferrari', team_color: 'ED1131', first_name: 'Charles', last_name: 'Leclerc', country_code: 'MON' }
    ];

    vi.spyOn(openF1, 'getRaceControl').mockResolvedValue([
      { meeting_key: 1201, session_key: 9001, date: '2025-03-02T15:10:00Z', driver_number: null, lap_number: 5, category: 'SafetyCar', flag: null, scope: 'Track', sector: null, qualifying_phase: null, message: 'SAFETY CAR DEPLOYED' },
      { meeting_key: 1201, session_key: 9001, date: '2025-03-02T15:20:00Z', driver_number: 16, lap_number: 12, category: 'Other', flag: null, scope: 'Driver', sector: null, qualifying_phase: null, message: '5 SECOND TIME PENALTY FOR CAR 16 (LEC)' },
      { meeting_key: 1201, session_key: 9001, date: '2025-03-02T15:25:00Z', driver_number: null, lap_number: 15, category: 'Flag', flag: 'RED', scope: 'Track', sector: null, qualifying_phase: null, message: 'RED FLAG' }
    ]);

    await component.setActiveTab(9001, 'race_control');
    const state = component.raceControlState[9001];
    expect(state).toBeTruthy();

    expect(component.countRaceControlByFilter(9001, 'red_flag')).toBe(1);
    expect(component.countRaceControlByFilter(9001, 'safety_car')).toBe(1);
    expect(component.countRaceControlByFilter(9001, 'penalty')).toBe(1);

    state.selectedFilter = 'penalty';
    const penaltyFiltered = component.getFilteredRaceControlMessages(9001);
    expect(penaltyFiltered.length).toBe(1);
    expect(penaltyFiltered[0].driver_number).toBe(16);

    state.selectedFilter = 'all';
    state.searchQuery = 'Safety';
    const searchFiltered = component.getFilteredRaceControlMessages(9001);
    expect(searchFiltered.length).toBe(1);
    expect(searchFiltered[0].message).toContain('SAFETY CAR');
  });

  it('should filter and sort team radios chronologically', async () => {
    const openF1 = TestBed.inject(Openf1ServiceService);
    component.drivers = [
      { driver_number: 1, broadcast_name: 'M VERSTAPPEN', full_name: 'Max Verstappen', name_acronym: 'VER', team_name: 'Red Bull Racing', team_color: '3671C6', first_name: 'Max', last_name: 'Verstappen', country_code: 'NED' },
      { driver_number: 16, broadcast_name: 'C LECLERC', full_name: 'Charles Leclerc', name_acronym: 'LEC', team_name: 'Ferrari', team_color: 'ED1131', first_name: 'Charles', last_name: 'Leclerc', country_code: 'MON' }
    ];

    vi.spyOn(openF1, 'getTeamRadio').mockResolvedValue([
      { date: '2025-03-02T15:05:00Z', driver_number: 1, meeting_key: 1201, session_key: 9001, recording_url: 'https://example.com/radio1.mp3' },
      { date: '2025-03-02T15:25:00Z', driver_number: 16, meeting_key: 1201, session_key: 9001, recording_url: 'https://example.com/radio2.mp3' }
    ]);

    await component.setActiveTab(9001, 'radio');
    const state = component.radioState[9001];
    expect(state).toBeTruthy();

    const asc = component.getFilteredTeamRadios(9001);
    expect(asc[0].driver_number).toBe(1);

    component.toggleRadioSort(9001);
    const desc = component.getFilteredTeamRadios(9001);
    expect(desc[0].driver_number).toBe(16);

    state.selectedDriver = 1;
    const driverFiltered = component.getFilteredTeamRadios(9001);
    expect(driverFiltered.length).toBe(1);
    expect(driverFiltered[0].driver_number).toBe(1);
  });
});
