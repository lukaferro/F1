import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-header" [class.centered]="centered">
      <div class="section-header-main">
        @if (badge) {
          <span class="f1-badge section-badge">
            @if (icon) {
              <i [class]="icon"></i>
            }
            <span>{{ badge }}</span>
          </span>
        }
        <h2 class="section-title">{{ title }}</h2>
        @if (subtitle) {
          <p class="section-subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="section-header-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin-bottom: 1.75rem;
    }

    .section-header.centered {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .section-header-main {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .section-header.centered .section-header-main {
      align-items: center;
    }

    .section-badge {
      width: fit-content;
    }

    .section-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--text-primary);
      position: relative;
      padding-bottom: 0.55rem;
      margin: 0;
    }

    .section-title::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 56px;
      height: 4px;
      background: var(--f1-red);
      border-radius: 2px;
    }

    .section-header.centered .section-title::after {
      left: 50%;
      transform: translateX(-50%);
    }

    .section-subtitle {
      font-size: 0.95rem;
      color: var(--text-secondary);
      margin: 0.25rem 0 0;
      max-width: 680px;
    }

    .section-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
  `]
})
export class SectionHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() badge?: string;
  @Input() icon?: string;
  @Input() centered = false;
}
