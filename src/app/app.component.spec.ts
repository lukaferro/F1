import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
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
});

