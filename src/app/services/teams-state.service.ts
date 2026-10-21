import { Injectable } from '@angular/core';

export type TeamsSortBy = 'position' | 'titles' | 'wins' | 'name';

@Injectable({
  providedIn: 'root'
})
export class TeamsStateService {
  selectedYear: number | null = null;
  searchQuery = '';
  onlyChampions = false;
  sortBy: TeamsSortBy = 'position';

  reset(): void {
    this.selectedYear = null;
    this.searchQuery = '';
    this.onlyChampions = false;
    this.sortBy = 'position';
  }
}
