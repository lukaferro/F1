import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'granpremi',
    loadComponent: () =>
      import('./components/gran.premi/gran-premi.component').then(m => m.GranPremiComponent),
  },
  {
    // prima di granpremi/:id: le gare storiche hanno rotta con anno e round
    path: 'granpremi/storico/:season/:round',
    loadComponent: () =>
      import('./components/historic-gran-premi-detail/historic-gran-premi-detail.component').then(
        m => m.HistoricGranPremiDetailComponent
      ),
  },
  {
    path: 'granpremi/:id',
    loadComponent: () =>
      import('./components/gran-premi-detail/gran-premi-detail.component').then(
        m => m.GranPremiDetailComponent
      ),
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./components/drivers/drivers.component').then(m => m.DriversComponent),
  },
  {
    // prima di drivers/:id: alcuni driverId storici sono di tre lettere (es. "ide") come le sigle
    path: 'drivers/storico/:driverId',
    loadComponent: () =>
      import('./components/historic-driver-detail/historic-driver-detail.component').then(
        m => m.HistoricDriverDetailComponent
      ),
  },
  {
    path: 'drivers/:id',
    loadComponent: () =>
      import('./components/driver-detail/driver-detail.component').then(
        m => m.DriverDetailComponent
      ),
  },
  {
    path: 'scuderie',
    loadComponent: () =>
      import('./components/teams/teams.component').then(m => m.TeamsComponent),
  },
  {
    path: 'circuits',
    loadComponent: () =>
      import('./components/circuits/circuits.component').then(m => m.CircuitsComponent),
  },
  {
    path: 'classifiche',
    loadComponent: () =>
      import('./components/standings/standings.component').then(m => m.StandingsComponent),
  },
  {
    path: 'news',
    loadComponent: () =>
      import('./components/news/news.component').then(m => m.NewsComponent),
  }
];
