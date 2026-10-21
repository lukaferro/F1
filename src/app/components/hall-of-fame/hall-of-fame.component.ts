import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { StandingsStateService } from '../../services/standings-state.service';
import { constructorColor, ConstructorLogo, constructorLogo } from '../../utils/constructor-branding';
import { flagUrl } from '../../utils/country-flags';
import { nationalityToCountryCode } from '../../utils/nationality';

export interface HallOfFameSeason {
  year: number;
  driverId: string;
  driverCode?: string;
  driverName: string;
  driverNationality: string;
  driverTeamId: string;
  driverTeamName: string;
  constructorId: string | null;
  constructorName: string | null;
  constructorNationality: string | null;
}

export interface MultiChampionDriver {
  driverId: string;
  driverCode?: string;
  driverName: string;
  nationality: string;
  titles: number;
  years: number[];
}

export interface MultiChampionConstructor {
  constructorId: string;
  constructorName: string;
  nationality: string;
  titles: number;
  years: number[];
}

export interface DecadeFilter {
  id: string;
  label: string;
  startYear?: number;
  endYear?: number;
}

export const HALL_OF_FAME_DECADE_FILTERS: DecadeFilter[] = [
  { id: 'all', label: 'Tutte le epoche' },
  { id: '2020s', label: 'Anni 2020', startYear: 2020, endYear: 2029 },
  { id: '2010s', label: 'Anni 2010', startYear: 2010, endYear: 2019 },
  { id: '2000s', label: 'Anni 2000', startYear: 2000, endYear: 2009 },
  { id: '1990s', label: 'Anni ’90', startYear: 1990, endYear: 1999 },
  { id: '1980s', label: 'Anni ’80', startYear: 1980, endYear: 1989 },
  { id: '1970s', label: 'Anni ’70', startYear: 1970, endYear: 1979 },
  { id: '1960s', label: 'Anni ’60', startYear: 1960, endYear: 1969 },
  { id: '1950s', label: 'Anni ’50', startYear: 1950, endYear: 1959 }
];

export const HALL_OF_FAME_SEASONS: HallOfFameSeason[] = [
  { year: 2025, driverId: 'norris', driverCode: 'NOR', driverName: 'Lando Norris', driverNationality: 'British', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 2024, driverId: 'max_verstappen', driverCode: 'VER', driverName: 'Max Verstappen', driverNationality: 'Dutch', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 2023, driverId: 'max_verstappen', driverCode: 'VER', driverName: 'Max Verstappen', driverNationality: 'Dutch', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2022, driverId: 'max_verstappen', driverCode: 'VER', driverName: 'Max Verstappen', driverNationality: 'Dutch', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2021, driverId: 'max_verstappen', driverCode: 'VER', driverName: 'Max Verstappen', driverNationality: 'Dutch', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2020, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2019, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2018, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2017, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2016, driverId: 'rosberg', driverName: 'Nico Rosberg', driverNationality: 'German', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2015, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2014, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: 'mercedes', constructorName: 'Mercedes', constructorNationality: 'German' },
  { year: 2013, driverId: 'vettel', driverName: 'Sebastian Vettel', driverNationality: 'German', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2012, driverId: 'vettel', driverName: 'Sebastian Vettel', driverNationality: 'German', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2011, driverId: 'vettel', driverName: 'Sebastian Vettel', driverNationality: 'German', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2010, driverId: 'vettel', driverName: 'Sebastian Vettel', driverNationality: 'German', driverTeamId: 'red_bull', driverTeamName: 'Red Bull', constructorId: 'red_bull', constructorName: 'Red Bull', constructorNationality: 'Austrian' },
  { year: 2009, driverId: 'button', driverName: 'Jenson Button', driverNationality: 'British', driverTeamId: 'brawn', driverTeamName: 'Brawn GP', constructorId: 'brawn', constructorName: 'Brawn GP', constructorNationality: 'British' },
  { year: 2008, driverId: 'hamilton', driverCode: 'HAM', driverName: 'Lewis Hamilton', driverNationality: 'British', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2007, driverId: 'raikkonen', driverName: 'Kimi Räikkönen', driverNationality: 'Finnish', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2006, driverId: 'alonso', driverCode: 'ALO', driverName: 'Fernando Alonso', driverNationality: 'Spanish', driverTeamId: 'renault', driverTeamName: 'Renault', constructorId: 'renault', constructorName: 'Renault', constructorNationality: 'French' },
  { year: 2005, driverId: 'alonso', driverCode: 'ALO', driverName: 'Fernando Alonso', driverNationality: 'Spanish', driverTeamId: 'renault', driverTeamName: 'Renault', constructorId: 'renault', constructorName: 'Renault', constructorNationality: 'French' },
  { year: 2004, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2003, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2002, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2001, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 2000, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1999, driverId: 'hakkinen', driverName: 'Mika Häkkinen', driverNationality: 'Finnish', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1998, driverId: 'hakkinen', driverName: 'Mika Häkkinen', driverNationality: 'Finnish', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1997, driverId: 'villeneuve', driverName: 'Jacques Villeneuve', driverNationality: 'Canadian', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1996, driverId: 'damon_hill', driverName: 'Damon Hill', driverNationality: 'British', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1995, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'benetton', driverTeamName: 'Benetton', constructorId: 'benetton', constructorName: 'Benetton', constructorNationality: 'British' },
  { year: 1994, driverId: 'michael_schumacher', driverName: 'Michael Schumacher', driverNationality: 'German', driverTeamId: 'benetton', driverTeamName: 'Benetton', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1993, driverId: 'prost', driverName: 'Alain Prost', driverNationality: 'French', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1992, driverId: 'mansell', driverName: 'Nigel Mansell', driverNationality: 'British', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1991, driverId: 'senna', driverName: 'Ayrton Senna', driverNationality: 'Brazilian', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1990, driverId: 'senna', driverName: 'Ayrton Senna', driverNationality: 'Brazilian', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1989, driverId: 'prost', driverName: 'Alain Prost', driverNationality: 'French', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1988, driverId: 'senna', driverName: 'Ayrton Senna', driverNationality: 'Brazilian', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1987, driverId: 'piquet', driverName: 'Nelson Piquet', driverNationality: 'Brazilian', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1986, driverId: 'prost', driverName: 'Alain Prost', driverNationality: 'French', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1985, driverId: 'prost', driverName: 'Alain Prost', driverNationality: 'French', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1984, driverId: 'lauda', driverName: 'Niki Lauda', driverNationality: 'Austrian', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1983, driverId: 'piquet', driverName: 'Nelson Piquet', driverNationality: 'Brazilian', driverTeamId: 'brabham', driverTeamName: 'Brabham', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1982, driverId: 'keke_rosberg', driverName: 'Keke Rosberg', driverNationality: 'Finnish', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1981, driverId: 'piquet', driverName: 'Nelson Piquet', driverNationality: 'Brazilian', driverTeamId: 'brabham', driverTeamName: 'Brabham', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1980, driverId: 'jones', driverName: 'Alan Jones', driverNationality: 'Australian', driverTeamId: 'williams', driverTeamName: 'Williams', constructorId: 'williams', constructorName: 'Williams', constructorNationality: 'British' },
  { year: 1979, driverId: 'scheckter', driverName: 'Jody Scheckter', driverNationality: 'South African', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1978, driverId: 'andretti', driverName: 'Mario Andretti', driverNationality: 'American', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1977, driverId: 'lauda', driverName: 'Niki Lauda', driverNationality: 'Austrian', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1976, driverId: 'hunt', driverName: 'James Hunt', driverNationality: 'British', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1975, driverId: 'lauda', driverName: 'Niki Lauda', driverNationality: 'Austrian', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1974, driverId: 'emerson_fittipaldi', driverName: 'Emerson Fittipaldi', driverNationality: 'Brazilian', driverTeamId: 'mclaren', driverTeamName: 'McLaren', constructorId: 'mclaren', constructorName: 'McLaren', constructorNationality: 'British' },
  { year: 1973, driverId: 'stewart', driverName: 'Jackie Stewart', driverNationality: 'British', driverTeamId: 'tyrrell', driverTeamName: 'Tyrrell', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1972, driverId: 'emerson_fittipaldi', driverName: 'Emerson Fittipaldi', driverNationality: 'Brazilian', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1971, driverId: 'stewart', driverName: 'Jackie Stewart', driverNationality: 'British', driverTeamId: 'tyrrell', driverTeamName: 'Tyrrell', constructorId: 'tyrrell', constructorName: 'Tyrrell', constructorNationality: 'British' },
  { year: 1970, driverId: 'rindt', driverName: 'Jochen Rindt', driverNationality: 'Austrian', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1969, driverId: 'stewart', driverName: 'Jackie Stewart', driverNationality: 'British', driverTeamId: 'matra', driverTeamName: 'Matra', constructorId: 'matra', constructorName: 'Matra', constructorNationality: 'French' },
  { year: 1968, driverId: 'hill', driverName: 'Graham Hill', driverNationality: 'British', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1967, driverId: 'hulme', driverName: 'Denny Hulme', driverNationality: 'New Zealander', driverTeamId: 'brabham', driverTeamName: 'Brabham', constructorId: 'brabham', constructorName: 'Brabham', constructorNationality: 'British' },
  { year: 1966, driverId: 'brabham', driverName: 'Jack Brabham', driverNationality: 'Australian', driverTeamId: 'brabham', driverTeamName: 'Brabham', constructorId: 'brabham', constructorName: 'Brabham', constructorNationality: 'British' },
  { year: 1965, driverId: 'clark', driverName: 'Jim Clark', driverNationality: 'British', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1964, driverId: 'surtees', driverName: 'John Surtees', driverNationality: 'British', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1963, driverId: 'clark', driverName: 'Jim Clark', driverNationality: 'British', driverTeamId: 'team_lotus', driverTeamName: 'Team Lotus', constructorId: 'team_lotus', constructorName: 'Team Lotus', constructorNationality: 'British' },
  { year: 1962, driverId: 'hill', driverName: 'Graham Hill', driverNationality: 'British', driverTeamId: 'brm', driverTeamName: 'BRM', constructorId: 'brm', constructorName: 'BRM', constructorNationality: 'British' },
  { year: 1961, driverId: 'phil_hill', driverName: 'Phil Hill', driverNationality: 'American', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'ferrari', constructorName: 'Ferrari', constructorNationality: 'Italian' },
  { year: 1960, driverId: 'brabham', driverName: 'Jack Brabham', driverNationality: 'Australian', driverTeamId: 'cooper', driverTeamName: 'Cooper', constructorId: 'cooper', constructorName: 'Cooper', constructorNationality: 'British' },
  { year: 1959, driverId: 'brabham', driverName: 'Jack Brabham', driverNationality: 'Australian', driverTeamId: 'cooper', driverTeamName: 'Cooper', constructorId: 'cooper', constructorName: 'Cooper', constructorNationality: 'British' },
  { year: 1958, driverId: 'hawthorn', driverName: 'Mike Hawthorn', driverNationality: 'British', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: 'vanwall', constructorName: 'Vanwall', constructorNationality: 'British' },
  { year: 1957, driverId: 'fangio', driverName: 'Juan Manuel Fangio', driverNationality: 'Argentine', driverTeamId: 'maserati', driverTeamName: 'Maserati', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1956, driverId: 'fangio', driverName: 'Juan Manuel Fangio', driverNationality: 'Argentine', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1955, driverId: 'fangio', driverName: 'Juan Manuel Fangio', driverNationality: 'Argentine', driverTeamId: 'mercedes', driverTeamName: 'Mercedes', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1954, driverId: 'fangio', driverName: 'Juan Manuel Fangio', driverNationality: 'Argentine', driverTeamId: 'mercedes', driverTeamName: 'Maserati / Mercedes', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1953, driverId: 'ascari', driverName: 'Alberto Ascari', driverNationality: 'Italian', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1952, driverId: 'ascari', driverName: 'Alberto Ascari', driverNationality: 'Italian', driverTeamId: 'ferrari', driverTeamName: 'Ferrari', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1951, driverId: 'fangio', driverName: 'Juan Manuel Fangio', driverNationality: 'Argentine', driverTeamId: 'alfa', driverTeamName: 'Alfa Romeo', constructorId: null, constructorName: null, constructorNationality: null },
  { year: 1950, driverId: 'farina', driverName: 'Nino Farina', driverNationality: 'Italian', driverTeamId: 'alfa', driverTeamName: 'Alfa Romeo', constructorId: null, constructorName: null, constructorNationality: null }
];

@Component({
  selector: 'app-hall-of-fame',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule],
  templateUrl: './hall-of-fame.component.html',
  styleUrl: './hall-of-fame.component.css'
})
export class HallOfFameComponent {
  private readonly stateService = inject(StandingsStateService);

  @Output() selectYear = new EventEmitter<number>();

  readonly seasons = HALL_OF_FAME_SEASONS;
  readonly decadeFilters = HALL_OF_FAME_DECADE_FILTERS;
  private readonly failedLogos = new Set<string>();

  readonly topDrivers: MultiChampionDriver[] = this.computeTopDrivers();
  readonly topConstructors: MultiChampionConstructor[] = this.computeTopConstructors();

  get selectedDecade(): string {
    return this.stateService.hallOfFameDecade;
  }

  set selectedDecade(value: string) {
    this.stateService.hallOfFameDecade = value;
  }

  get searchTerm(): string {
    return this.stateService.hallOfFameSearch;
  }

  set searchTerm(value: string) {
    this.stateService.hallOfFameSearch = value;
  }

  get hasActiveFilters(): boolean {
    return this.selectedDecade !== 'all' || this.searchTerm.trim().length > 0;
  }

  get filteredSeasons(): HallOfFameSeason[] {
    const decade = this.decadeFilters.find(d => d.id === this.selectedDecade);
    const query = this.searchTerm.trim().toLowerCase();

    return this.seasons.filter(entry => {
      if (decade?.startYear !== undefined && decade?.endYear !== undefined) {
        if (entry.year < decade.startYear || entry.year > decade.endYear) {
          return false;
        }
      }
      if (!query) return true;
      return (
        String(entry.year).includes(query) ||
        entry.driverName.toLowerCase().includes(query) ||
        entry.driverTeamName.toLowerCase().includes(query) ||
        (entry.constructorName?.toLowerCase().includes(query) ?? false)
      );
    });
  }

  setDecade(decadeId: string): void {
    this.selectedDecade = decadeId;
  }

  filterByQuery(query: string): void {
    this.selectedDecade = 'all';
    this.searchTerm = query;
  }

  resetFilters(): void {
    this.selectedDecade = 'all';
    this.searchTerm = '';
  }

  openSeasonStandings(year: number): void {
    this.selectYear.emit(year);
  }

  driverLink(entry: { driverId: string; driverCode?: string; year?: number }): string[] {
    if (entry.driverCode) {
      return ['/drivers', entry.driverCode];
    }
    return ['/drivers', 'storico', entry.driverId];
  }

  flagForNationality(nationality: string | null): string | undefined {
    if (!nationality) return undefined;
    return flagUrl(nationalityToCountryCode(nationality));
  }

  colorFor(constructorId: string | null): string {
    return constructorId ? constructorColor(constructorId) : '666666';
  }

  logoFor(constructorId: string | null): ConstructorLogo | undefined {
    if (!constructorId || this.failedLogos.has(constructorId)) return undefined;
    return constructorLogo(constructorId);
  }

  onLogoError(constructorId: string | null): void {
    if (constructorId) this.failedLogos.add(constructorId);
  }

  private computeTopDrivers(): MultiChampionDriver[] {
    const map = new Map<string, MultiChampionDriver>();
    for (const s of HALL_OF_FAME_SEASONS) {
      const existing = map.get(s.driverId);
      if (existing) {
        existing.titles += 1;
        existing.years.push(s.year);
      } else {
        map.set(s.driverId, {
          driverId: s.driverId,
          driverCode: s.driverCode,
          driverName: s.driverName,
          nationality: s.driverNationality,
          titles: 1,
          years: [s.year]
        });
      }
    }
    return Array.from(map.values())
      .filter(d => d.titles >= 3)
      .map(d => ({ ...d, years: [...d.years].sort((a, b) => a - b) }))
      .sort((a, b) => b.titles - a.titles || b.years[b.years.length - 1] - a.years[a.years.length - 1]);
  }

  private computeTopConstructors(): MultiChampionConstructor[] {
    const map = new Map<string, MultiChampionConstructor>();
    for (const s of HALL_OF_FAME_SEASONS) {
      if (!s.constructorId || !s.constructorName || !s.constructorNationality) continue;
      const existing = map.get(s.constructorId);
      if (existing) {
        existing.titles += 1;
        existing.years.push(s.year);
      } else {
        map.set(s.constructorId, {
          constructorId: s.constructorId,
          constructorName: s.constructorName,
          nationality: s.constructorNationality,
          titles: 1,
          years: [s.year]
        });
      }
    }
    return Array.from(map.values())
      .filter(c => c.titles >= 2)
      .map(c => ({ ...c, years: [...c.years].sort((a, b) => a - b) }))
      .sort((a, b) => b.titles - a.titles || b.years[b.years.length - 1] - a.years[a.years.length - 1]);
  }
}
