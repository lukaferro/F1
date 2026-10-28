import { Injectable } from '@angular/core';

export type StandingsTab = 'drivers' | 'constructors' | 'simulator' | 'hall-of-fame';

@Injectable({
  providedIn: 'root'
})
export class StandingsStateService {
  selectedSeason: number | null = null;
  tab: StandingsTab = 'drivers';
  hallOfFameDecade = 'all';
  hallOfFameSearch = '';

  reset(): void {
    this.selectedSeason = null;
    this.tab = 'drivers';
    this.hallOfFameDecade = 'all';
    this.hallOfFameSearch = '';
  }
}
