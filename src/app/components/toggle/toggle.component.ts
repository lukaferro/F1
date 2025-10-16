import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.css']
})
export class ToggleComponent {
  private readonly themeService = inject(ThemeService);

  get isDark() {
    return this.themeService.isDark();
  }

  get themeIcon() {
    return this.isDark ? 'pi pi-sun' : 'pi pi-moon';
  }

  get themeLabel() {
    return this.isDark ? 'Tema Chiaro' : 'Tema Scuro';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
