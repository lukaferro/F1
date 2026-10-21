import { Component, HostListener, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FooterComponent } from "./components/footer/footer.component";
import { GranPremiStateService } from './services/gran-premi-state.service';
import { DriversStateService } from './services/drivers-state.service';
import { StandingsStateService } from './services/standings-state.service';
import { filter } from 'rxjs';

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

  showBackToTop = false;
  isNavHidden = false;
  isScrolled = false;

  private lastScrollTop = 0;
  private readonly scrollThreshold = 70;

  ngOnInit() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isNavHidden = false;
        this.showBackToTop = false;
        this.lastScrollTop = 0;
        this.syncSectionFilterState(e.urlAfterRedirects);
      });
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
