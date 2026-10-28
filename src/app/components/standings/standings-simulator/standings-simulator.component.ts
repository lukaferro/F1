import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DriverStanding, ConstructorStanding, JolpicaService, SeasonScheduleItem } from '../../../services/jolpica.service';
import {
  ChampionshipSimulationResult,
  SimulatorContender,
  SimulatorRaceRound
} from '../../../models/championship-simulator';
import {
  calculateChampionship,
  getSeasonScoringRules,
  SeasonScoringRules
} from '../../../utils/championship-calculator';
import { countryNameToCode, smallFlagUrl } from '../../../utils/country-flags';
import { constructorColor } from '../../../utils/constructor-branding';

interface ContenderOption {
  label: string;
  value: string;
  color?: string;
}

@Component({
  selector: 'app-standings-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule],
  templateUrl: './standings-simulator.component.html',
  styleUrl: './standings-simulator.component.css'
})
export class StandingsSimulatorComponent implements OnInit, OnChanges {
  private readonly jolpica = inject(JolpicaService);

  @Input() season!: number;
  @Input() driverStandings: DriverStanding[] = [];
  @Input() constructorStandings: ConstructorStanding[] = [];
  @Input() isCurrentSeason = false;

  mode: 'drivers' | 'constructors' = 'drivers';
  loading = false;
  schedule: SeasonScheduleItem[] = [];
  rounds: SimulatorRaceRound[] = [];
  simulationResult: ChampionshipSimulationResult | null = null;

  // Opzioni per i selettori nei round
  contenderOptions: ContenderOption[] = [];

  // Filtro round da simulare per stagioni passate: 'remaining' | 'last3' | 'last5' | 'all'
  pastSeasonPreset: 'remaining' | 'last3' | 'last5' | 'all' = 'last3';

  async ngOnInit(): Promise<void> {
    await this.loadSchedule();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['season'] && !changes['season'].firstChange) {
      await this.loadSchedule();
    } else if (changes['driverStandings'] || changes['constructorStandings']) {
      this.updateContenderOptions();
      this.recalculate();
    }
  }

  async loadSchedule(): Promise<void> {
    if (!this.season) return;
    this.loading = true;
    try {
      const scheduleItems = await this.jolpica.getSeasonSchedule(this.season);
      this.schedule = scheduleItems;
      this.initializeRounds();
      this.updateContenderOptions();
      this.recalculate();
    } catch {
      this.schedule = [];
      this.rounds = [];
    } finally {
      this.loading = false;
    }
  }

  setMode(mode: 'drivers' | 'constructors'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.updateContenderOptions();
    this.recalculate();
  }

  setPastSeasonPreset(preset: 'remaining' | 'last3' | 'last5' | 'all'): void {
    this.pastSeasonPreset = preset;
    this.initializeRounds();
    this.recalculate();
  }

  private initializeRounds(): void {
    if (!this.schedule.length) {
      this.rounds = [];
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const total = this.schedule.length;

    this.rounds = this.schedule.map((item, index) => {
      let isCompleted = false;

      if (this.isCurrentSeason) {
        // Se la gara è già passata nel calendario
        isCompleted = item.date < todayStr;
      } else {
        // Stagione passata: gestisci in base al preset scelto
        if (this.pastSeasonPreset === 'all') {
          isCompleted = false;
        } else if (this.pastSeasonPreset === 'last3') {
          isCompleted = index < total - 3;
        } else if (this.pastSeasonPreset === 'last5') {
          isCompleted = index < total - 5;
        } else {
          isCompleted = false;
        }
      }

      return {
        round: item.round,
        raceName: item.raceName,
        circuitId: item.circuitId,
        circuitName: item.circuitName,
        locality: item.locality,
        country: item.country,
        date: item.date,
        hasSprint: item.hasSprint,
        isCompleted
      };
    });
  }

  private updateContenderOptions(): void {
    if (this.mode === 'drivers') {
      this.contenderOptions = this.driverStandings.map(d => ({
        label: `${d.fullName} (${d.constructorName})`,
        value: d.driverId,
        color: '#' + constructorColor(d.constructorId)
      }));
    } else {
      this.contenderOptions = this.constructorStandings.map(c => ({
        label: c.name,
        value: c.constructorId,
        color: '#' + constructorColor(c.constructorId)
      }));
    }
  }

  recalculate(): void {
    if (!this.driverStandings.length && !this.constructorStandings.length) {
      this.simulationResult = null;
      return;
    }

    if (this.mode === 'drivers') {
      const base = this.driverStandings.map(d => ({
        id: d.driverId,
        name: d.fullName,
        code: d.code,
        constructorId: d.constructorId,
        constructorName: d.constructorName,
        color: '#' + constructorColor(d.constructorId),
        currentPoints: d.points,
        currentWins: d.wins
      }));
      this.simulationResult = calculateChampionship(base, this.rounds, 'drivers', this.season);
    } else {
      const base = this.constructorStandings.map(c => ({
        id: c.constructorId,
        name: c.name,
        code: c.name.substring(0, 3).toUpperCase(),
        constructorId: c.constructorId,
        constructorName: c.name,
        color: '#' + constructorColor(c.constructorId),
        currentPoints: c.points,
        currentWins: c.wins
      }));
      this.simulationResult = calculateChampionship(base, this.rounds, 'constructors', this.season);
    }
  }

  // Preset rapidi
  resetSimulation(): void {
    for (const r of this.rounds) {
      r.raceWinnerId = undefined;
      r.raceSecondId = undefined;
      r.raceThirdId = undefined;
      r.fastestLapDriverId = undefined;
      r.sprintWinnerId = undefined;
    }
    this.recalculate();
  }

  presetAllWinsToLeader(): void {
    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    if (!leader) return;

    for (const r of this.rounds) {
      if (!r.isCompleted) {
        r.raceWinnerId = leader;
        r.fastestLapDriverId = leader;
        if (r.hasSprint) r.sprintWinnerId = leader;
      }
    }
    this.recalculate();
  }

  presetAllWinsToSecond(): void {
    const second = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!second) return;

    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;

    for (const r of this.rounds) {
      if (!r.isCompleted) {
        r.raceWinnerId = second;
        r.raceSecondId = leader;
        r.fastestLapDriverId = second;
        if (r.hasSprint) r.sprintWinnerId = second;
      }
    }
    this.recalculate();
  }

  clearRound(r: SimulatorRaceRound): void {
    r.raceWinnerId = undefined;
    r.raceSecondId = undefined;
    r.raceThirdId = undefined;
    r.fastestLapDriverId = undefined;
    r.sprintWinnerId = undefined;
    this.recalculate();
  }

  flagUrl(country: string): string {
    const code = countryNameToCode(country);
    return code ? smallFlagUrl(code) : '';
  }

  get remainingSimulatableRounds(): SimulatorRaceRound[] {
    return this.rounds.filter(r => !r.isCompleted);
  }

  get rules(): SeasonScoringRules {
    return getSeasonScoringRules(this.season || 2024);
  }
}
