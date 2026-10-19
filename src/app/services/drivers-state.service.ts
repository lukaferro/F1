import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DriversStateService {
  selectedYear: number | null = null;
  searchQuery: string = '';
}
