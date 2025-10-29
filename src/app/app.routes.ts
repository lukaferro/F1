import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { GranPremiComponent } from './components/gran.premi/gran-premi.component';
import { GranPremiDetailComponent } from './components/gran-premi-detail/gran-premi-detail.component';

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
    path: 'granpremi/:id',
    component: GranPremiDetailComponent,
  }
];
