import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { JolpicaService, ConstructorStanding, DriverStanding } from '../../services/jolpica.service';
import { TeamsStateService, TeamsSortBy } from '../../services/teams-state.service';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { constructorColor, constructorLogo, ConstructorLogo } from '../../utils/constructor-branding';
import { flagUrl } from '../../utils/country-flags';
import { nationalityToCountryCode } from '../../utils/nationality';

export interface TeamDriverLink {
  driverId: string;
  fullName: string;
  points: number;
  wins: number;
}

export interface TeamCard {
  constructorId: string;
  name: string;
  nationality: string;
  flag?: string;
  color: string;
  logo?: ConstructorLogo;
  position: number;
  points: number;
  seasonWins: number;
  worldTitles: number;
  titleYears: number[];
  base?: string;
  powerUnit?: string;
  debutYear?: number;
  drivers: TeamDriverLink[];
}

interface TeamProfileMeta {
  base: string;
  powerUnit: string;
  debutYear: number;
}

export const CONSTRUCTOR_WORLD_TITLES: Record<string, number[]> = {
  ferrari: [1961, 1964, 1975, 1976, 1977, 1979, 1982, 1983, 1999, 2000, 2001, 2002, 2003, 2004, 2007, 2008],
  williams: [1980, 1981, 1986, 1987, 1992, 1993, 1994, 1996, 1997],
  mclaren: [1974, 1984, 1985, 1988, 1989, 1990, 1991, 1998, 2024, 2025],
  mercedes: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
  red_bull: [2010, 2011, 2012, 2013, 2022, 2023],
  team_lotus: [1963, 1965, 1968, 1970, 1972, 1973, 1978],
  lotus: [1963, 1965, 1968, 1970, 1972, 1973, 1978],
  'lotus-climax': [1963, 1965],
  'lotus-ford': [1968, 1970, 1972, 1973],
  brabham: [1966, 1967],
  'brabham-repco': [1966, 1967],
  cooper: [1959, 1960],
  'cooper-climax': [1959, 1960],
  renault: [2005, 2006],
  benetton: [1995],
  tyrrell: [1971],
  matra: [1969],
  'matra-ford': [1969],
  brm: [1962],
  vanwall: [1958],
  brawn: [2009]
};

const TEAM_PROFILE_METADATA: Record<string, TeamProfileMeta> = {
  ferrari: { base: 'Maranello, Italia', powerUnit: 'Ferrari', debutYear: 1950 },
  mclaren: { base: 'Woking, Regno Unito', powerUnit: 'Mercedes', debutYear: 1966 },
  red_bull: { base: 'Milton Keynes, Regno Unito', powerUnit: 'Red Bull Ford / Honda RBPT', debutYear: 2005 },
  mercedes: { base: 'Brackley, Regno Unito', powerUnit: 'Mercedes', debutYear: 1954 },
  aston_martin: { base: 'Silverstone, Regno Unito', powerUnit: 'Honda / Mercedes', debutYear: 1959 },
  alpine: { base: 'Enstone, Regno Unito', powerUnit: 'Renault / Mercedes', debutYear: 2021 },
  williams: { base: 'Grove, Regno Unito', powerUnit: 'Mercedes', debutYear: 1977 },
  rb: { base: 'Faenza, Italia', powerUnit: 'Red Bull Ford / Honda RBPT', debutYear: 2024 },
  alphatauri: { base: 'Faenza, Italia', powerUnit: 'Honda RBPT', debutYear: 2020 },
  toro_rosso: { base: 'Faenza, Italia', powerUnit: 'Ferrari / Renault / Honda', debutYear: 2006 },
  haas: { base: 'Kannapolis, USA / Banbury, UK', powerUnit: 'Ferrari', debutYear: 2016 },
  sauber: { base: 'Hinwil, Svizzera', powerUnit: 'Ferrari', debutYear: 1993 },
  audi: { base: 'Hinwil, Svizzera / Neuburg, Germania', powerUnit: 'Audi', debutYear: 2026 },
  cadillac: { base: 'Fishers, USA / Silverstone, UK', powerUnit: 'Ferrari', debutYear: 2026 },
  alfa: { base: 'Hinwil, Svizzera', powerUnit: 'Ferrari', debutYear: 1950 },
  renault: { base: 'Enstone, Regno Unito / Viry-Châtillon', powerUnit: 'Renault', debutYear: 1977 },
  benetton: { base: 'Enstone, Regno Unito', powerUnit: 'Ford / Renault', debutYear: 1986 },
  jordan: { base: 'Silverstone, Regno Unito', powerUnit: 'Ford / Mugen-Honda', debutYear: 1991 },
  brawn: { base: 'Brackley, Regno Unito', powerUnit: 'Mercedes', debutYear: 2009 },
  tyrrell: { base: 'Ockham, Regno Unito', powerUnit: 'Ford Cosworth', debutYear: 1970 },
  brabham: { base: 'Chessington, Regno Unito', powerUnit: 'Repco / Ford / BMW', debutYear: 1962 },
  team_lotus: { base: 'Hethel, Regno Unito', powerUnit: 'Climax / Ford / Renault', debutYear: 1958 },
  lotus: { base: 'Hethel, Regno Unito', powerUnit: 'Climax / Ford / Renault', debutYear: 1958 },
  minardi: { base: 'Faenza, Italia', powerUnit: 'Ford / Ferrari / Cosworth', debutYear: 1985 }
};

const baseConstructorKey = (id: string): string => id.split('-')[0];

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SelectModule, InputTextModule, ApiUnavailableComponent],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.css']
})
export class TeamsComponent implements OnInit {
  private readonly jolpicaService = inject(JolpicaService);
  private readonly stateService = inject(TeamsStateService);

  years: Array<{ label: string; value: number | null }> = [];
  readonly sortOptions: Array<{ label: string; value: TeamsSortBy }> = [
    { label: 'Posizione in Classifica', value: 'position' },
    { label: 'Titoli Mondiali vinti', value: 'titles' },
    { label: 'Vittorie in stagione', value: 'wins' },
    { label: 'Nome (A-Z)', value: 'name' }
  ];

  selectedYear: number | null = null;
  activeSeasonYear = new Date().getFullYear();
  searchQuery = '';
  onlyChampions = false;
  sortBy: TeamsSortBy = 'position';

  teams: TeamCard[] = [];
  filteredTeams: TeamCard[] = [];
  loading = false;
  error?: string;

  private loadSeq = 0;

  async ngOnInit(): Promise<void> {
    this.selectedYear = this.stateService.selectedYear;
    this.searchQuery = this.stateService.searchQuery;
    this.onlyChampions = this.stateService.onlyChampions;
    this.sortBy = this.stateService.sortBy;
    await this.initSeasonsAndLoad();
  }

  private async initSeasonsAndLoad(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      const seasons = await this.jolpicaService.getSeasons();
      // La Coppa Costruttori è stata istituita nel 1958
      const constructorSeasons = seasons.filter(y => y >= 1958).sort((a, b) => b - a);
      const latestYear = constructorSeasons[0] ?? new Date().getFullYear();

      this.years = [
        { label: `Stagione attuale (${latestYear})`, value: null },
        ...constructorSeasons.slice(1).map(y => ({ label: y.toString(), value: y }))
      ];

      await this.loadSeasonTeams(this.selectedYear ?? latestYear);
    } catch (err: any) {
      this.error = err?.message || 'Impossibile caricare le scuderie.';
      this.loading = false;
    }
  }

  async onYearChange(year: number | null): Promise<void> {
    this.selectedYear = year;
    this.saveState();
    const latestFromDropdown = this.years.length > 1 ? (this.years[1].value ?? 2025) + 1 : new Date().getFullYear();
    await this.loadSeasonTeams(year ?? latestFromDropdown);
  }

  onFilterChange(): void {
    this.saveState();
    this.applyFilters();
  }

  toggleOnlyChampions(): void {
    this.onlyChampions = !this.onlyChampions;
    this.saveState();
    this.applyFilters();
  }

  async resetFilters(): Promise<void> {
    this.stateService.reset();
    this.selectedYear = null;
    this.searchQuery = '';
    this.onlyChampions = false;
    this.sortBy = 'position';
    const latestFromDropdown = this.years.length > 1 ? (this.years[1].value ?? 2025) + 1 : new Date().getFullYear();
    await this.loadSeasonTeams(latestFromDropdown);
  }

  async retryLoad(): Promise<void> {
    await this.initSeasonsAndLoad();
  }

  private saveState(): void {
    this.stateService.selectedYear = this.selectedYear;
    this.stateService.searchQuery = this.searchQuery;
    this.stateService.onlyChampions = this.onlyChampions;
    this.stateService.sortBy = this.sortBy;
  }

  private async loadSeasonTeams(seasonYear: number): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.error = undefined;

    try {
      let [constructorStandings, driverStandings] = await Promise.all([
        this.jolpicaService.getConstructorStandings(seasonYear),
        this.jolpicaService.getDriverStandings(seasonYear).catch(() => [] as DriverStanding[])
      ]);

      // Se la stagione corrente è appena iniziata e non ha ancora classifica, usa la stagione precedente
      if (constructorStandings.length === 0 && !this.selectedYear) {
        const fallbackYear = seasonYear - 1;
        [constructorStandings, driverStandings] = await Promise.all([
          this.jolpicaService.getConstructorStandings(fallbackYear),
          this.jolpicaService.getDriverStandings(fallbackYear).catch(() => [] as DriverStanding[])
        ]);
        this.activeSeasonYear = fallbackYear;
      } else {
        this.activeSeasonYear = seasonYear;
      }

      if (seq !== this.loadSeq) return;

      this.teams = this.buildTeamCards(constructorStandings, driverStandings);
      this.applyFilters();
    } catch (err: any) {
      if (seq !== this.loadSeq) return;
      this.error = err?.message || 'Impossibile caricare le scuderie della stagione.';
      this.teams = [];
      this.filteredTeams = [];
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
      }
    }
  }

  private buildTeamCards(
    constructors: ConstructorStanding[],
    drivers: DriverStanding[]
  ): TeamCard[] {
    return constructors.map(c => {
      const baseKey = baseConstructorKey(c.constructorId);
      const titleYears =
        CONSTRUCTOR_WORLD_TITLES[c.constructorId] ??
        CONSTRUCTOR_WORLD_TITLES[baseKey] ??
        [];
      const meta =
        TEAM_PROFILE_METADATA[c.constructorId] ??
        TEAM_PROFILE_METADATA[baseKey];

      const countryCode = c.nationality ? nationalityToCountryCode(c.nationality) : undefined;
      const teamDrivers: TeamDriverLink[] = drivers
        .filter(d =>
          d.constructorId === c.constructorId ||
          d.constructors?.some(entry => entry.id === c.constructorId)
        )
        .map(d => ({
          driverId: d.driverId,
          fullName: d.fullName,
          points: d.points,
          wins: d.wins
        }));

      return {
        constructorId: c.constructorId,
        name: c.name,
        nationality: c.nationality,
        flag: flagUrl(countryCode) || undefined,
        color: constructorColor(c.constructorId),
        logo: constructorLogo(c.constructorId),
        position: c.position,
        points: c.points,
        seasonWins: c.wins,
        worldTitles: titleYears.length,
        titleYears,
        base: meta?.base,
        powerUnit: meta?.powerUnit,
        debutYear: meta?.debutYear,
        drivers: teamDrivers
      };
    });
  }

  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();

    const filtered = this.teams.filter(team => {
      if (this.onlyChampions && team.worldTitles === 0) {
        return false;
      }
      if (!q) return true;
      const matchesTeam =
        team.name.toLowerCase().includes(q) ||
        team.nationality.toLowerCase().includes(q) ||
        (team.base && team.base.toLowerCase().includes(q)) ||
        (team.powerUnit && team.powerUnit.toLowerCase().includes(q));
      const matchesDriver = team.drivers.some(d => d.fullName.toLowerCase().includes(q));
      return matchesTeam || matchesDriver;
    });

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'titles':
          return b.worldTitles - a.worldTitles || a.position - b.position;
        case 'wins':
          return b.seasonWins - a.seasonWins || a.position - b.position;
        case 'name':
          return a.name.localeCompare(b.name, 'it');
        case 'position':
        default:
          return a.position - b.position;
      }
    });

    this.filteredTeams = filtered;
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedYear !== null ||
      this.searchQuery.trim().length > 0 ||
      this.onlyChampions ||
      this.sortBy !== 'position'
    );
  }
}
