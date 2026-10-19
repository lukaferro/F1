import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

import { HomeComponent } from './home.component';
import { Openf1ServiceService } from '../../services/openf1-service';
import { Meeting } from '../../models/meeting';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let openF1Mock: {
    getMeetings: ReturnType<typeof vi.fn>;
    getDrivers: ReturnType<typeof vi.fn>;
  };

  const currentYear = new Date().getFullYear();
  const futureMeeting: Meeting = {
    id: 1250,
    meeting_key: 1250,
    meeting_code: 'ITA',
    meeting_name: 'Italian Grand Prix',
    meeting_official_name: 'Formula 1 Pirelli Gran Premio d\'Italia 2026',
    location: 'Monza',
    country_code: 'ITA',
    country_name: 'Italy',
    circuit_key: 10,
    circuit_short_name: 'Monza',
    date_start: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    gmt_offset: '+02:00',
    year: currentYear
  };

  const pastMeeting: Meeting = {
    id: 1200,
    meeting_key: 1200,
    meeting_code: 'BHR',
    meeting_name: 'Bahrain Grand Prix',
    meeting_official_name: 'Formula 1 Bahrain Grand Prix 2026',
    location: 'Sakhir',
    country_code: 'BHR',
    country_name: 'Bahrain',
    circuit_key: 3,
    circuit_short_name: 'Bahrain',
    date_start: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    gmt_offset: '+03:00',
    year: currentYear
  };

  beforeEach(async () => {
    openF1Mock = {
      getMeetings: vi.fn().mockResolvedValue([pastMeeting, futureMeeting]),
      getDrivers: vi.fn().mockResolvedValue([])
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: Openf1ServiceService, useValue: openF1Mock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the upcoming next race widget and countdown', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.nextMeeting).toEqual(futureMeeting);
    expect(component.isUpcoming).toBe(true);
    expect(component.countdown.days).toBeGreaterThanOrEqual(4);

    const widget = fixture.debugElement.query(By.css('.next-race-section'));
    expect(widget).toBeTruthy();
    expect(widget.nativeElement.textContent).toContain('Prossimo Gran Premio');
    expect(widget.nativeElement.textContent).toContain('Monza');
    expect(widget.nativeElement.textContent).toContain('Inizio weekend tra:');
  });

  it('should display the last completed race badge if all meetings are in the past', async () => {
    openF1Mock.getMeetings.mockResolvedValue([pastMeeting]);
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.nextMeeting).toEqual(pastMeeting);
    expect(component.isUpcoming).toBe(false);

    const badge = fixture.debugElement.query(By.css('.next-race-badge'));
    expect(badge.nativeElement.textContent).toContain('Ultimo Gran Premio disputato');
  });

  it('should render all 4 feature cards including Classifiche', () => {
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.feature-cards p-card'));
    expect(cards.length).toBe(4);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Gran Premi');
    expect(text).toContain('Circuiti');
    expect(text).toContain('Piloti');
    expect(text).toContain('Classifiche');
  });
});
