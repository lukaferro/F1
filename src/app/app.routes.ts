import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { GranPremioComponent } from './gran-premio.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'granpremio',
    component: GranPremioComponent,
  }
];
