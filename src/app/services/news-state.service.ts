import { Injectable } from '@angular/core';

export type NewsCategory = 'Tutte' | 'Gare & Paddock' | 'Scuderie' | 'Piloti' | 'Tecnica';

@Injectable({
  providedIn: 'root'
})
export class NewsStateService {
  selectedCategory: NewsCategory = 'Tutte';
  searchQuery = '';

  reset(): void {
    this.selectedCategory = 'Tutte';
    this.searchQuery = '';
  }
}
