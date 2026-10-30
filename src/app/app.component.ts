import { Component, HostListener, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FooterComponent } from "./components/footer/footer.component";
import { GranPremiStateService } from './services/gran-premi-state.service';
import { DriversStateService } from './services/drivers-state.service';
import { StandingsStateService } from './services/standings-state.service';
import { NewsStateService } from './services/news-state.service';
import { TeamsStateService } from './services/teams-state.service';
import { filter } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly granPremiState = inject(GranPremiStateService);
  private readonly driversState = inject(DriversStateService);
  private readonly standingsState = inject(StandingsStateService);
  private readonly newsState = inject(NewsStateService);
  private readonly teamsState = inject(TeamsStateService);

  showBackToTop = false;
  isNavHidden = false;
  isScrolled = false;

  // Stato PWA / App Installabile & Connettività Offline
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  isStandaloneApp = false;
  showInstallGuideModal = false;
  isOffline = false;

  private lastScrollTop = 0;
  private readonly scrollThreshold = 70;

  ngOnInit() {
    this.checkStandaloneMode();
    this.checkOnlineStatus();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isNavHidden = false;
        this.showBackToTop = false;
        this.lastScrollTop = 0;
        this.syncSectionFilterState(e.urlAfterRedirects);
      });
  }

  private checkStandaloneMode(): void {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    this.isStandaloneApp = Boolean(isStandalone);
  }

  private checkOnlineStatus(): void {
    if (typeof navigator === 'undefined') return;
    this.isOffline = navigator.onLine === false;
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOffline = false;
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOffline = true;
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.deferredInstallPrompt = event as BeforeInstallPromptEvent;
  }

  @HostListener('window:appinstalled')
  onAppInstalled(): void {
    this.deferredInstallPrompt = null;
    this.isStandaloneApp = true;
    this.showInstallGuideModal = false;
  }

  async triggerInstallApp(): Promise<void> {
    if (this.deferredInstallPrompt) {
      await this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.deferredInstallPrompt = null;
      }
      return;
    }
    this.showInstallGuideModal = true;
  }

  closeInstallGuide(): void {
    this.showInstallGuideModal = false;
  }

  /**
   * Mantiene i filtri attivi solo finché si resta nella stessa sezione (es. lista <-> dettaglio).
   * Passando a un'altra sezione dell'app i filtri della sezione precedente vengono azzerati.
   */
  private syncSectionFilterState(url: string): void {
    const path = url.split('?')[0].split('#')[0];

    if (!path.startsWith('/granpremi')) {
      this.granPremiState.reset();
    }

    if (!path.startsWith('/drivers')) {
      this.driversState.reset();
    }

    const isDriverDetail = path.startsWith('/drivers/') && path !== '/drivers';
    if (!path.startsWith('/classifiche') && !isDriverDetail) {
      this.standingsState.reset();
    }

    if (!path.startsWith('/scuderie') && !isDriverDetail) {
      this.teamsState.reset();
    }

    if (!path.startsWith('/news')) {
      this.newsState.reset();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    this.showBackToTop = currentScroll > 300;
    this.isScrolled = currentScroll > 10;

    if (currentScroll <= this.scrollThreshold) {
      this.isNavHidden = false;
      this.lastScrollTop = currentScroll;
      return;
    }

    if (currentScroll - this.lastScrollTop > 10) {
      // Scroll verso il basso: nascondi navbar
      this.isNavHidden = true;
    } else if (this.lastScrollTop - currentScroll > 10) {
      // Scroll verso l'alto: mostra navbar
      this.isNavHidden = false;
    }

    this.lastScrollTop = currentScroll;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
