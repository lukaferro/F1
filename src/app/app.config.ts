import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
 
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient } from '@angular/common/http';
 
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })), // gestione delle rotte; ogni pagina si apre dall'inizio
    provideHttpClient(), // necessario per le richieste HTTP e API REST
    provideAnimationsAsync(), // necessario per i componenti di PrimeNG che usano le animazioni
    providePrimeNG({
      theme: {
        preset: 'Aura',
        options: {
          darkModeSelector: '.dark'
        }
      }
    })
  ]
};