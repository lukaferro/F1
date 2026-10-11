import { Component, EventEmitter, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

// Avviso mostrato al centro della pagina quando le API di OpenF1 non rispondono
@Component({
  selector: 'app-api-unavailable',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './api-unavailable.component.html',
  styleUrls: ['./api-unavailable.component.css']
})
export class ApiUnavailableComponent {
  @Output() retry = new EventEmitter<void>();
}
