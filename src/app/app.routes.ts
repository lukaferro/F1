import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { GranPremiComponent } from './components/gran.premi/gran-premi.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'granpremi',
    component: GranPremiComponent,
  }
];
