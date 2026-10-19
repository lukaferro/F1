import { Component, HostListener, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FooterComponent } from "./components/footer/footer.component";
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

  showBackToTop = false;
  isNavHidden = false;
  isScrolled = false;

  private lastScrollTop = 0;
  private readonly scrollThreshold = 70;

  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.isNavHidden = false;
        this.showBackToTop = false;
        this.lastScrollTop = 0;
      });
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

