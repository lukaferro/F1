import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { GranPremiStateService } from './services/gran-premi-state.service';
import { DriversStateService } from './services/drivers-state.service';
import { StandingsStateService } from './services/standings-state.service';

@Component({ standalone: true, template: '' })
class DummyRouteComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'granpremi', component: DummyRouteComponent },
          { path: 'granpremi/:id', component: DummyRouteComponent },
          { path: 'granpremi/storico/:season/:round', component: DummyRouteComponent },
          { path: 'drivers', component: DummyRouteComponent },
          { path: 'drivers/:id', component: DummyRouteComponent },
          { path: 'classifiche', component: DummyRouteComponent },
          { path: 'circuiti', component: DummyRouteComponent }
        ])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the main sections in the menu', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent ?? '';
    expect(nav).toContain('Gran Premi');
    expect(nav).toContain('Circuiti');
    expect(nav).toContain('Piloti');
    expect(nav).toContain('Classifiche');
  });

  it('should toggle smart navbar visibility and back-to-top button on window scroll', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showBackToTop).toBe(false);
    expect(component.isNavHidden).toBe(false);

    // Simulate scrolling down past 300px
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.showBackToTop).toBe(true);
    expect(component.isNavHidden).toBe(true);

    const backToTopBtn = (fixture.nativeElement as HTMLElement).querySelector('.back-to-top');
    expect(backToTopBtn).toBeTruthy();

    // Simulate scrolling up
    Object.defineProperty(window, 'scrollY', { value: 350, writable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isNavHidden).toBe(false);
  });

  it('should call window.scrollTo when scrollToTop is invoked', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    component.scrollToTop();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should update offline status badge when window offline/online events fire', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();
    expect(component.isOffline).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.offline-status-pill')).toBeTruthy();

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(component.isOffline).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.offline-status-pill')).toBeNull();
  });

  it('should preserve section filters when navigating to detail within the same section and reset them when switching section', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const gpState = TestBed.inject(GranPremiStateService);
    const driversState = TestBed.inject(DriversStateService);
    const standingsState = TestBed.inject(StandingsStateService);

    await router.navigateByUrl('/granpremi');
    gpState.selectedYear = 2021;
    gpState.selectedCountry = 'Italy';
    gpState.selectedCircuit = 'Monza';

    // Going to a GP detail keeps the GP filters intact
    await router.navigateByUrl('/granpremi/storico/2021/14');
    expect(gpState.selectedYear).toBe(2021);
    expect(gpState.selectedCountry).toBe('Italy');
    expect(gpState.selectedCircuit).toBe('Monza');

    // Returning to /granpremi still keeps the GP filters
    await router.navigateByUrl('/granpremi');
    expect(gpState.selectedYear).toBe(2021);
    expect(gpState.selectedCountry).toBe('Italy');
    expect(gpState.selectedCircuit).toBe('Monza');

    // Navigating to a different section (/classifiche) resets the GP filters
    await router.navigateByUrl('/classifiche');
    expect(gpState.selectedYear).toBeNull();
    expect(gpState.selectedCountry).toBeNull();
    expect(gpState.selectedCircuit).toBeNull();

    // Set standings & drivers filters, then navigate to driver detail and finally to /circuiti
    standingsState.selectedSeason = 2020;
    standingsState.tab = 'constructors';
    await router.navigateByUrl('/drivers');
    driversState.selectedYear = 2019;
    driversState.searchQuery = 'Leclerc';

    await router.navigateByUrl('/drivers/LEC');
    expect(driversState.selectedYear).toBe(2019);
    expect(driversState.searchQuery).toBe('Leclerc');

    await router.navigateByUrl('/circuiti');
    expect(driversState.selectedYear).toBeNull();
    expect(driversState.searchQuery).toBe('');
    expect(standingsState.selectedSeason).toBeNull();
    expect(standingsState.tab).toBe('drivers');
  });
});
