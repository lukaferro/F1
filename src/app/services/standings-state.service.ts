import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StandingsStateService {
  selectedSeason: number | null = null;
  tab: 'drivers' | 'constructors' = 'drivers';

  reset(): void {
    this.selectedSeason = null;
    this.tab = 'drivers';
  }
}
