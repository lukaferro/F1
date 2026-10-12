import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DriverDetailComponent } from './driver-detail.component';

describe('DriverDetailComponent', () => {
  let component: DriverDetailComponent;
  let fixture: ComponentFixture<DriverDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverDetailComponent],
      // router e HTTP finti: i componenti li usano, ma nei test non devono chiamare l'API vera
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(DriverDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const showDriver = (countryCode?: string) => {
    component.error = undefined;
    component.loading = false;
    component.driver = {
      driver_number: 44, full_name: 'Lewis HAMILTON', broadcast_name: 'L HAMILTON', name_acronym: 'HAM',
      team_name: 'Ferrari', team_color: 'E80020', country_code: countryCode
    } as any;
    fixture.detectChanges();
  };
  const flagSkeleton = () => (fixture.nativeElement as HTMLElement).querySelector('.flag-container .flag-skeleton');

  it('keeps the flag skeleton while the nationality may still arrive from Jolpica', () => {
    showDriver(undefined);
    expect(flagSkeleton()).toBeTruthy();

    component.onNationality('British');
    fixture.detectChanges();
    expect(component.driver?.country_code).toBe('GBR');
  });

  it('drops the flag skeleton when Jolpica has no nationality', () => {
    showDriver(undefined);
    component.onNationality(null);
    fixture.detectChanges();

    expect(flagSkeleton()).toBeNull();
  });

  it('shows the current info cards of the driver', () => {
    component.error = undefined;
    component.loading = false;
    component.driver = {
      driver_number: 44, full_name: 'Lewis HAMILTON', broadcast_name: 'L HAMILTON', name_acronym: 'HAM',
      team_name: 'Ferrari', team_color: 'E80020', country_code: 'GBR'
    } as any;
    fixture.detectChanges();

    const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.stat-card'))
      .map(card => card.textContent?.replace(/\s+/g, ' ').trim());
    expect(cards).toEqual(['Numero#44', 'TeamFerrari', 'AcronimoHAM', 'PaeseGBR']);
  });
});
