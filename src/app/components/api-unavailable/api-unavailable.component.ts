import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

// Avviso mostrato al centro della pagina quando un'API esterna (OpenF1 o Jolpica) non risponde
@Component({
  selector: 'app-api-unavailable',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './api-unavailable.component.html',
  styleUrls: ['./api-unavailable.component.css']
})
export class ApiUnavailableComponent {
  @Input() source: 'openf1' | 'jolpica' = 'openf1';
  @Output() retry = new EventEmitter<void>();
}
