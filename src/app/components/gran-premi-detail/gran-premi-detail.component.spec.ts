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
});
