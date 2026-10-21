import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GranPremiDetailComponent } from './gran-premi-detail.component';
import { Openf1ServiceService } from '../../services/openf1-service';
import { Meeting } from '../../models/meeting';

describe('GranPremiDetailComponent', () => {
  let component: GranPremiDetailComponent;
  let fixture: ComponentFixture<GranPremiDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranPremiDetailComponent],
      // router e HTTP finti: i componenti li usano, ma nei test non devono chiamare l'API vera
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
});
