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
import {
  calculateFutureScenario,
  calculateHistoricalWhatIf,
  FAMOUS_HISTORICAL_PIVOTS,
  FutureScenarioMode,
  HistoricalPivot,
  ScenarioSimulationOutcome
} from '../../../utils/what-if-scenarios';
import { countryNameToCode, smallFlagUrl } from '../../../utils/country-flags';
import { constructorColor } from '../../../utils/constructor-branding';

export interface ContenderOption {
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

  // Scenari grafici & What If
  futureScenarioMode: FutureScenarioMode = 'trend';
  selectedHistoricalPivot: HistoricalPivot | null = null;
  historicalPivotsForSeason: HistoricalPivot[] = [];
  scenarioOutcome: ScenarioSimulationOutcome | null = null;
  hoveredRoundIndex: number | null = null;

  // Dimensioni SVG grafico
  chartSvgWidth = 860;
  chartSvgHeight = 280;
  chartMaxPoints = 100;
  yTicks: Array<{ y: number; val: number }> = [];

  // Editor manuale avanzato
  showManualRoundsEditor = false;

  // Opzioni per i selettori nei round
  contenderOptions: ContenderOption[] = [];

  // Round con posizioni estese espanse (P4-P10 e Sprint completa)
  expandedRoundDetails = new Set<number>();

  // Filtro round da simulare per stagioni passate: 'remaining' | 'last3' | 'last5' | 'all'
  pastSeasonPreset: 'remaining' | 'last3' | 'last5' | 'all' = 'last3';

  // Selettore temporaneo per aggiungere DNF nei round
  selectedDnfForRound: Record<number, string | undefined> = {};

  async ngOnInit(): Promise<void> {
    await this.loadSchedule();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['season'] && !changes['season'].firstChange) {
      await this.loadSchedule();
    } else if (changes['driverStandings'] || changes['constructorStandings']) {
      this.updateContenderOptions();
      this.recalculate();
      this.recalculateScenario();
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

      // Bivi storici per la stagione corrente selezionata
      this.historicalPivotsForSeason = FAMOUS_HISTORICAL_PIVOTS.filter(p => p.season === this.season);
      this.selectedHistoricalPivot = this.historicalPivotsForSeason[0] || null;

      this.recalculate();
      this.recalculateScenario();
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

  setFutureScenario(scenario: FutureScenarioMode): void {
    if (this.futureScenarioMode === scenario) return;
    this.futureScenarioMode = scenario;
    this.recalculateScenario();
  }

  selectHistoricalPivot(pivot: HistoricalPivot | null): void {
    this.selectedHistoricalPivot = pivot;
    this.recalculateScenario();
  }

  toggleManualRoundsEditor(): void {
    this.showManualRoundsEditor = !this.showManualRoundsEditor;
  }

  recalculateScenario(): void {
    if (!this.schedule.length || !this.driverStandings.length) {
      this.scenarioOutcome = null;
      return;
    }

    if (this.isCurrentSeason) {
      this.scenarioOutcome = calculateFutureScenario(
        this.schedule,
        this.driverStandings,
        this.season,
        this.futureScenarioMode
      );
    } else {
      this.scenarioOutcome = calculateHistoricalWhatIf(
        this.schedule,
        this.driverStandings,
        this.season,
        this.selectedHistoricalPivot
      );
    }

    if (this.scenarioOutcome) {
      this.computeSvgCoordinates(this.scenarioOutcome);
    }
  }

  private computeSvgCoordinates(outcome: ScenarioSimulationOutcome): void {
    const margin = { top: 25, right: 35, bottom: 35, left: 50 };
    const plotWidth = this.chartSvgWidth - margin.left - margin.right;
    const plotHeight = this.chartSvgHeight - margin.top - margin.bottom;

    const totalRounds = outcome.roundsAxis.length;
    if (totalRounds <= 1) return;

    let maxPoints = 50;
    for (const s of outcome.series) {
      for (const n of [...s.realNodes, ...s.projectedNodes]) {
        if (n.cumulative > maxPoints) maxPoints = n.cumulative;
      }
    }
    this.chartMaxPoints = Math.ceil(maxPoints / 50) * 50;

    // Tacche asse Y
    this.yTicks = [0, 0.25, 0.5, 0.75, 1].map(frac => {
      const val = Math.round(this.chartMaxPoints * frac);
      const y = margin.top + (1 - frac) * plotHeight;
      return { y, val };
    });

    const getX = (roundIndex: number) => margin.left + (roundIndex / (totalRounds - 1)) * plotWidth;
    const getY = (pts: number) => margin.top + (1 - pts / this.chartMaxPoints) * plotHeight;

    for (const s of outcome.series) {
      let realD = '';
      let projD = '';

      const allNodes = [...s.realNodes, ...s.projectedNodes].sort((a, b) => a.round - b.round);
      allNodes.forEach((n, idx) => {
        (n as any).x = getX(idx);
        (n as any).y = getY(n.cumulative);
      });

      s.realNodes.forEach((n, idx) => {
        const x = (n as any).x;
        const y = (n as any).y;
        realD += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });

      if (s.projectedNodes.length > 0) {
        const lastReal = s.realNodes[s.realNodes.length - 1];
        if (lastReal) {
          projD += `M ${(lastReal as any).x} ${(lastReal as any).y}`;
        }
        s.projectedNodes.forEach(n => {
          const x = (n as any).x;
          const y = (n as any).y;
          projD += projD === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
      }

      s.realPathD = realD;
      s.projectedPathD = projD;
    }
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
        isCompleted = item.date < todayStr;
      } else {
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
        isCompleted,
        racePositions: [],
        sprintPositions: [],
        dnfContenderIds: []
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

  // Posizioni Gara estese
  getRacePosition(r: SimulatorRaceRound, index: number): string | undefined {
    if (r.racePositions && r.racePositions[index] !== undefined) {
      return r.racePositions[index];
    }
    if (index === 0) return r.raceWinnerId;
    if (index === 1) return r.raceSecondId;
    if (index === 2) return r.raceThirdId;
    return undefined;
  }

  setRacePosition(r: SimulatorRaceRound, index: number, value: string | undefined): void {
    if (!r.racePositions) {
      r.racePositions = [];
    }
    while (r.racePositions.length < this.rules.racePoints.length) {
      r.racePositions.push(undefined);
    }
    r.racePositions[index] = value || undefined;
    if (index === 0) r.raceWinnerId = value || undefined;
    if (index === 1) r.raceSecondId = value || undefined;
    if (index === 2) r.raceThirdId = value || undefined;

    if (value && r.dnfContenderIds) {
      r.dnfContenderIds = r.dnfContenderIds.filter(id => id !== value);
    }

    this.recalculate();
  }

  // Posizioni Sprint estese
  getSprintPosition(r: SimulatorRaceRound, index: number): string | undefined {
    if (r.sprintPositions && r.sprintPositions[index] !== undefined) {
      return r.sprintPositions[index];
    }
    if (index === 0) return r.sprintWinnerId;
    return undefined;
  }

  setSprintPosition(r: SimulatorRaceRound, index: number, value: string | undefined): void {
    if (!r.sprintPositions) {
      r.sprintPositions = [];
    }
    while (r.sprintPositions.length < this.rules.sprintPoints.length) {
      r.sprintPositions.push(undefined);
    }
    r.sprintPositions[index] = value || undefined;
    if (index === 0) r.sprintWinnerId = value || undefined;

    if (value && r.dnfContenderIds) {
      r.dnfContenderIds = r.dnfContenderIds.filter(id => id !== value);
    }

    this.recalculate();
  }

  // Gestione DNF / Zero Punti
  isContenderDnf(r: SimulatorRaceRound, id: string): boolean {
    return !!r.dnfContenderIds && r.dnfContenderIds.includes(id);
  }

  addDnfContender(r: SimulatorRaceRound, id: string | undefined): void {
    if (!id) return;
    if (!r.dnfContenderIds) r.dnfContenderIds = [];
    if (!r.dnfContenderIds.includes(id)) {
      r.dnfContenderIds.push(id);
    }
    if (r.racePositions) {
      r.racePositions = r.racePositions.map(p => (p === id ? undefined : p));
    }
    if (r.sprintPositions) {
      r.sprintPositions = r.sprintPositions.map(p => (p === id ? undefined : p));
    }
    if (r.raceWinnerId === id) r.raceWinnerId = undefined;
    if (r.raceSecondId === id) r.raceSecondId = undefined;
    if (r.raceThirdId === id) r.raceThirdId = undefined;
    if (r.sprintWinnerId === id) r.sprintWinnerId = undefined;
    if (r.fastestLapDriverId === id) r.fastestLapDriverId = undefined;

    this.selectedDnfForRound[r.round] = undefined;
    this.recalculate();
  }

  removeDnfContender(r: SimulatorRaceRound, id: string): void {
    if (!r.dnfContenderIds) return;
    r.dnfContenderIds = r.dnfContenderIds.filter(x => x !== id);
    this.recalculate();
  }

  getContenderName(id: string): string {
    const opt = this.contenderOptions.find(o => o.value === id);
    return opt ? opt.label : id;
  }

  isOptionDisabled(r: SimulatorRaceRound, optValue: string, currentPosIdx: number, type: 'race' | 'sprint'): boolean {
    if (this.isContenderDnf(r, optValue)) return true;

    if (type === 'race') {
      const positions = r.racePositions || [];
      if (this.mode === 'drivers') {
        const foundIdx = positions.indexOf(optValue);
        return foundIdx !== -1 && foundIdx !== currentPosIdx;
      } else {
        const occurrences = positions.filter((p, idx) => p === optValue && idx !== currentPosIdx).length;
        return occurrences >= 2;
      }
    } else {
      const positions = r.sprintPositions || [];
      if (this.mode === 'drivers') {
        const foundIdx = positions.indexOf(optValue);
        return foundIdx !== -1 && foundIdx !== currentPosIdx;
      } else {
        const occurrences = positions.filter((p, idx) => p === optValue && idx !== currentPosIdx).length;
        return occurrences >= 2;
      }
    }
  }

  toggleRoundExpand(roundNumber: number): void {
    if (this.expandedRoundDetails.has(roundNumber)) {
      this.expandedRoundDetails.delete(roundNumber);
    } else {
      this.expandedRoundDetails.add(roundNumber);
    }
  }

  isRoundExpanded(roundNumber: number): boolean {
    return this.expandedRoundDetails.has(roundNumber);
  }

  // Preset rapidi
  resetSimulation(): void {
    for (const r of this.rounds) {
      r.raceWinnerId = undefined;
      r.raceSecondId = undefined;
      r.raceThirdId = undefined;
      r.fastestLapDriverId = undefined;
      r.sprintWinnerId = undefined;
      r.racePositions = [];
      r.sprintPositions = [];
      r.dnfContenderIds = [];
    }
    this.selectedDnfForRound = {};
    this.recalculate();
  }

  presetAllWinsToLeader(): void {
    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    if (!leader) return;

    for (const r of this.rounds) {
      if (!r.isCompleted) {
        this.setRacePosition(r, 0, leader);
        if (this.rules.hasFastestLapPoint) {
          r.fastestLapDriverId = leader;
        }
        if (r.hasSprint) {
          this.setSprintPosition(r, 0, leader);
        }
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
        this.setRacePosition(r, 0, second);
        if (leader) this.setRacePosition(r, 1, leader);
        if (this.rules.hasFastestLapPoint) {
          r.fastestLapDriverId = second;
        }
        if (r.hasSprint) {
          this.setSprintPosition(r, 0, second);
          if (leader) this.setSprintPosition(r, 1, leader);
        }
      }
    }
    this.recalculate();
  }

  presetLeaderDnf(): void {
    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    if (!leader) return;

    const second = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;

    for (const r of this.rounds) {
      if (!r.isCompleted) {
        this.addDnfContender(r, leader);
        if (second) {
          this.setRacePosition(r, 0, second);
          if (this.rules.hasFastestLapPoint) {
            r.fastestLapDriverId = second;
          }
          if (r.hasSprint) {
            this.setSprintPosition(r, 0, second);
          }
        }
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
    r.racePositions = [];
    r.sprintPositions = [];
    r.dnfContenderIds = [];
    this.selectedDnfForRound[r.round] = undefined;
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

  get secondaryRacePositions(): number[] {
    const pts = this.rules.racePoints;
    const indices: number[] = [];
    for (let i = 3; i < pts.length; i++) {
      indices.push(i);
    }
    return indices;
  }

  get secondarySprintPositions(): number[] {
    const pts = this.rules.sprintPoints;
    const indices: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      indices.push(i);
    }
    return indices;
  }
}
