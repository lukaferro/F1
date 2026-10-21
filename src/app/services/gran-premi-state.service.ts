import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GranPremiStateService {
  selectedYear: number | null = null;
  selectedCountry: string | null = null;
  selectedCircuit: string | null = null;
  loadedHistoricYears: number[] = [];

  reset(): void {
    this.selectedYear = null;
    this.selectedCountry = null;
    this.selectedCircuit = null;
    this.loadedHistoricYears = [];
  }
}
