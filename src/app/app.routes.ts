import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { GranPremiComponent } from './components/gran.premi/gran-premi.component';
import { GranPremiDetailComponent } from './components/gran-premi-detail/gran-premi-detail.component';
import { DriversComponent } from './components/drivers/drivers.component';
import { DriverDetailComponent } from './components/driver-detail/driver-detail.component';
import { CircuitsComponent } from './components/circuits/circuits.component';
import { StandingsComponent } from './components/standings/standings.component';
import { HistoricDriverDetailComponent } from './components/historic-driver-detail/historic-driver-detail.component';
import { HistoricGranPremiDetailComponent } from './components/historic-gran-premi-detail/historic-gran-premi-detail.component';
import { NewsComponent } from './components/news/news.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'granpremi',
    component: GranPremiComponent,
  },
  {
    // prima di granpremi/:id: le gare storiche hanno rotta con anno e round
    path: 'granpremi/storico/:season/:round',
    component: HistoricGranPremiDetailComponent,
  },
  {
    path: 'granpremi/:id',
    component: GranPremiDetailComponent,
  },
  {
    path: 'drivers',
    component: DriversComponent,
  },
  {
    // prima di drivers/:id: alcuni driverId storici sono di tre lettere (es. "ide") come le sigle
    path: 'drivers/storico/:driverId',
    component: HistoricDriverDetailComponent,
  },
  {
    path: 'drivers/:id',
    component: DriverDetailComponent,
  },
  {
    path: 'circuits',
    component: CircuitsComponent,
  },
  {
    path: 'classifiche',
    component: StandingsComponent,
  },
  {
    path: 'news',
    component: NewsComponent,
  }
];
