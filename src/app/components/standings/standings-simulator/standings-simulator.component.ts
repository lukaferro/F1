import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import {
  ConstructorStanding,
  DriverStanding,
  JolpicaService,
  SeasonRoundPoints,
  SeasonScheduleItem
} from '../../../services/jolpica.service';
import {
  ChampionshipSimulationResult,
  SimulatorContender,
  SimulatorRaceRound
} from '../../../models/championship-simulator';
import {
  calculateChampionship,
  computeConfiguredRoundPoints,
  getSeasonScoringRules,
  SeasonScoringRules
} from '../../../utils/championship-calculator';
import {
  assignDistinctSimulatorColors,
  buildSimulatorComparisonChart,
  FAMOUS_HISTORICAL_PIVOTS,
  HistoricalPivot,
  SimChartRoundTick,
  SimulatorComparisonChart
} from '../../../utils/what-if-scenarios';
import { countryNameToCode, smallFlagUrl } from '../../../utils/country-flags';
import { constructorColor } from '../../../utils/constructor-branding';

export interface ContenderOption {
  label: string;
  shortLabel: string;
  value: string;
  constructorId: string;
  color: string;
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
  @Input() seasonRounds: SeasonRoundPoints[] = [];
  @Input() roundsLoading = false;
  @Input() isCurrentSeason = false;

  mode: 'drivers' | 'constructors' = 'drivers';
  loading = false;
  schedule: SeasonScheduleItem[] = [];
  rounds: SimulatorRaceRound[] = [];
  simulationResult: ChampionshipSimulationResult | null = null;

  // Grafico interattivo Reale vs Simulato
  comparisonChart: SimulatorComparisonChart | null = null;
  visibleContenderIds = new Set<string>();
  hoveredSeriesId: string | null = null;
  showRealGhostLine = true;
  activeQuickScenarioId: string | null = null;

  // Bivi storici per la stagione selezionata
  historicalPivotsForSeason: HistoricalPivot[] = [];

  // Navigazione e modalità editor delle gare ('single' = dettaglio completo R selezionato, 'grid' = tutte le gare)
  editorViewMode: 'single' | 'grid' = 'single';
  selectedRoundNumber = 1;
  inspectedRoundIndex = 0;

  // Opzioni per i selettori nei round
  contenderOptions: ContenderOption[] = [];

  // Round con posizioni estese espanse nella vista griglia
  expandedRoundDetails = new Set<number>();

  // Filtro preset retrocompatibile
  pastSeasonPreset: 'remaining' | 'last3' | 'last5' | 'all' = 'last3';

  // Selettore temporaneo per aggiungere DNF nei round
  selectedDnfForRound: Record<number, string | undefined> = {};

  async ngOnInit(): Promise<void> {
    await this.loadSchedule();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['season'] && !changes['season'].firstChange) {
      await this.loadSchedule();
    } else if (
      changes['driverStandings'] ||
      changes['constructorStandings'] ||
      changes['seasonRounds']
    ) {
      this.syncRealResultsIntoRounds();
      this.updateContenderOptions();
      this.ensureDefaultVisibleContenders();
      this.recalculate();
    }
  }

  async loadSchedule(): Promise<void> {
    if (!this.season) return;
    this.loading = true;
    try {
      const scheduleItems = await this.jolpica.getSeasonSchedule(this.season);
      this.schedule = scheduleItems;
      this.historicalPivotsForSeason = FAMOUS_HISTORICAL_PIVOTS.filter(p => p.season === this.season);
      this.activeQuickScenarioId = null;
      this.initializeRounds();
      this.updateContenderOptions();
      this. visibleContenderIds.clear();
      this.ensureDefaultVisibleContenders();
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
    this.activeQuickScenarioId = null;
    this.initializeRounds();
    this.updateContenderOptions();
    this.visibleContenderIds.clear();
    this.ensureDefaultVisibleContenders();
    this.recalculate();
  }

  setEditorViewMode(viewMode: 'single' | 'grid'): void {
    this.editorViewMode = viewMode;
  }

  setPastSeasonPreset(preset: 'remaining' | 'last3' | 'last5' | 'all'): void {
    this.pastSeasonPreset = preset;
    this.initializeRounds();
    this.recalculate();
  }

  private ensureDefaultVisibleContenders(): void {
    if (this.visibleContenderIds.size > 0) return;
    const list = this.mode === 'drivers'
      ? this.driverStandings.slice(0, 4).map(d => d.driverId)
      : this.constructorStandings.slice(0, 4).map(c => c.constructorId);
    for (const id of list) {
      this.visibleContenderIds.add(id);
    }
  }

  toggleChartContender(id: string): void {
    if (this.visibleContenderIds.has(id)) {
      if (this.visibleContenderIds.size > 1) {
        this.visibleContenderIds.delete(id);
        this.buildChart();
      }
    } else {
      this.visibleContenderIds.add(id);
      this.buildChart();
    }
  }

  isContenderVisibleOnChart(id: string): boolean {
    return this.visibleContenderIds.has(id);
  }

  setChartQuickLimit(count: number): void {
    this.visibleContenderIds.clear();
    const list = (this.simulationResult?.standings || []).slice(0, count);
    for (const c of list) {
      this.visibleContenderIds.add(c.id);
    }
    this.buildChart();
  }

  private initializeRounds(): void {
    if (!this.schedule.length) {
      this.rounds = [];
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const roundMap = new Map<number, SeasonRoundPoints>();
    for (const sr of this.seasonRounds || []) {
      roundMap.set(sr.round, sr);
    }

    const rules = this.rules;

    this.rounds = this.schedule.map(item => {
      const realData = roundMap.get(item.round);
      const hasRealData = Boolean(
        realData &&
        (Object.keys(realData.driverPoints || {}).length > 0 || (realData.raceOrder && realData.raceOrder.length > 0))
      );

      const isCompleted = hasRealData || (!this.isCurrentSeason && Boolean(this.seasonRounds?.length)) || (this.isCurrentSeason && item.date < todayStr && hasRealData);

      const roundObj: SimulatorRaceRound = {
        round: item.round,
        raceName: item.raceName,
        circuitId: item.circuitId,
        circuitName: item.circuitName,
        locality: item.locality,
        country: item.country,
        date: item.date,
        hasSprint: item.hasSprint,
        isCompleted,
        isModified: false,
        realDriverPoints: realData ? { ...realData.driverPoints } : {},
        realConstructorPoints: realData ? { ...realData.constructorPoints } : {},
        realRaceOrder: realData?.raceOrder ? [...realData.raceOrder] : [],
        realConstructorRaceOrder: realData?.constructorRaceOrder ? [...realData.constructorRaceOrder] : [],
        realSprintOrder: realData?.sprintOrder ? [...realData.sprintOrder] : [],
        realConstructorSprintOrder: realData?.constructorSprintOrder ? [...realData.constructorSprintOrder] : [],
        realFastestLapDriverId: realData?.fastestLapDriverId,
        racePositions: [],
        sprintPositions: [],
        dnfContenderIds: []
      };

      this.populateRoundFromReal(roundObj, rules);
      return roundObj;
    });

    // Seleziona di default il primo round futuro (se stagione in corso) oppure l'ultimo round della stagione
    const firstFuture = this.rounds.find(r => !r.isCompleted);
    if (firstFuture) {
      this.selectedRoundNumber = firstFuture.round;
      this.inspectedRoundIndex = this.rounds.indexOf(firstFuture);
    } else if (this.rounds.length > 0) {
      this.selectedRoundNumber = this.rounds[this.rounds.length - 1].round;
      this.inspectedRoundIndex = this.rounds.length - 1;
    }
  }

  /**
   * Quando seasonRounds viene caricato in modo asincrono, aggiorna i dati reali nei round non ancora modificati
   */
  private syncRealResultsIntoRounds(): void {
    if (!this.rounds.length || !this.seasonRounds?.length) return;
    const roundMap = new Map<number, SeasonRoundPoints>();
    for (const sr of this.seasonRounds) {
      roundMap.set(sr.round, sr);
    }
    const rules = this.rules;

    for (const r of this.rounds) {
      const realData = roundMap.get(r.round);
      if (!realData) continue;

      r.realDriverPoints = { ...realData.driverPoints };
      r.realConstructorPoints = { ...realData.constructorPoints };
      r.realRaceOrder = realData.raceOrder ? [...realData.raceOrder] : [];
      r.realConstructorRaceOrder = realData.constructorRaceOrder ? [...realData.constructorRaceOrder] : [];
      r.realSprintOrder = realData.sprintOrder ? [...realData.sprintOrder] : [];
      r.realConstructorSprintOrder = realData.constructorSprintOrder ? [...realData.constructorSprintOrder] : [];
      r.realFastestLapDriverId = realData.fastestLapDriverId;
      r.isCompleted = true;

      if (!r.isModified) {
        this.populateRoundFromReal(r, rules);
      }
    }
  }

  /**
   * Popola racePositions, sprintPositions e fastestLapDriverId di un round con l'ordine d'arrivo reale
   */
  private populateRoundFromReal(r: SimulatorRaceRound, rules: SeasonScoringRules): void {
    const raceLen = rules.racePoints.length;
    const sprintLen = rules.sprintPoints.length;
    const sourceRaceOrder = this.mode === 'drivers' ? (r.realRaceOrder || []) : (r.realConstructorRaceOrder || []);
    const sourceSprintOrder = this.mode === 'drivers' ? (r.realSprintOrder || []) : (r.realConstructorSprintOrder || []);

    r.racePositions = [];
    for (let i = 0; i < raceLen; i++) {
      r.racePositions.push(sourceRaceOrder[i] || undefined);
    }
    r.raceWinnerId = r.racePositions[0];
    r.raceSecondId = r.racePositions[1];
    r.raceThirdId = r.racePositions[2];

    r.sprintPositions = [];
    if (r.hasSprint && rules.hasSprint) {
      for (let i = 0; i < sprintLen; i++) {
        r.sprintPositions.push(sourceSprintOrder[i] || undefined);
      }
    }
    r.sprintWinnerId = r.sprintPositions[0];

    if (this.mode === 'drivers') {
      r.fastestLapDriverId = r.realFastestLapDriverId;
    } else if (r.realFastestLapDriverId) {
      const driver = this.driverStandings.find(d => d.driverId === r.realFastestLapDriverId);
      r.fastestLapDriverId = driver?.constructorId;
    } else {
      r.fastestLapDriverId = undefined;
    }

    r.dnfContenderIds = [];
    r.isModified = false;
  }

  private updateContenderOptions(): void {
    if (this.mode === 'drivers') {
      const items = this.driverStandings.map(d => ({
        id: d.driverId,
        constructorId: d.constructorId,
        color: '#' + constructorColor(d.constructorId)
      }));
      const distinctColors = assignDistinctSimulatorColors(items, 'drivers');

      this.contenderOptions = this.driverStandings.map(d => ({
        label: `${d.fullName} (${d.constructorName})`,
        shortLabel: d.code || d.fullName.split(' ').pop() || d.fullName,
        value: d.driverId,
        constructorId: d.constructorId,
        color: distinctColors.get(d.driverId)?.color || '#' + constructorColor(d.constructorId)
      }));
    } else {
      const items = this.constructorStandings.map(c => ({
        id: c.constructorId,
        constructorId: c.constructorId,
        color: '#' + constructorColor(c.constructorId)
      }));
      const distinctColors = assignDistinctSimulatorColors(items, 'constructors');

      this.contenderOptions = this.constructorStandings.map(c => ({
        label: c.name,
        shortLabel: c.name,
        value: c.constructorId,
        constructorId: c.constructorId,
        color: distinctColors.get(c.constructorId)?.color || '#' + constructorColor(c.constructorId)
      }));
    }
  }

  recalculate(): void {
    if (!this.driverStandings.length && !this.constructorStandings.length) {
      this.simulationResult = null;
      this.comparisonChart = null;
      return;
    }

    if (this.mode === 'drivers') {
      const items = this.driverStandings.map(d => ({
        id: d.driverId,
        constructorId: d.constructorId
      }));
      const colorMap = assignDistinctSimulatorColors(items, 'drivers');

      const base = this.driverStandings.map(d => ({
        id: d.driverId,
        name: d.fullName,
        code: d.code,
        constructorId: d.constructorId,
        constructorName: d.constructorName,
        color: colorMap.get(d.driverId)?.color || '#' + constructorColor(d.constructorId),
        currentPoints: d.points,
        currentWins: d.wins
      }));
      this.simulationResult = calculateChampionship(base, this.rounds, 'drivers', this.season);
    } else {
      const items = this.constructorStandings.map(c => ({
        id: c.constructorId,
        constructorId: c.constructorId
      }));
      const colorMap = assignDistinctSimulatorColors(items, 'constructors');

      const base = this.constructorStandings.map(c => ({
        id: c.constructorId,
        name: c.name,
        code: c.name.substring(0, 3).toUpperCase(),
        constructorId: c.constructorId,
        constructorName: c.name,
        color: colorMap.get(c.constructorId)?.color || '#' + constructorColor(c.constructorId),
        currentPoints: c.points,
        currentWins: c.wins
      }));
      this.simulationResult = calculateChampionship(base, this.rounds, 'constructors', this.season);
    }

    this.ensureDefaultVisibleContenders();
    this.buildChart();
  }

  private buildChart(): void {
    if (!this.simulationResult || !this.rounds.length) {
      this.comparisonChart = null;
      return;
    }

    const driverToConstructor = new Map<string, string>();
    for (const d of this.driverStandings) {
      driverToConstructor.set(d.driverId, d.constructorId);
    }

    const filteredContenders = this.simulationResult.standings.filter(c =>
      this.visibleContenderIds.has(c.id)
    );
    const contendersToPlot = filteredContenders.length > 0
      ? filteredContenders
      : this.simulationResult.standings.slice(0, 3);

    this.comparisonChart = buildSimulatorComparisonChart(
      this.rounds,
      contendersToPlot,
      this.mode,
      this.season,
      driverToConstructor
    );
  }

  // --- Selezione e navigazione Round ---
  selectRound(roundNumber: number): void {
    this.selectedRoundNumber = roundNumber;
    const idx = this.rounds.findIndex(r => r.round === roundNumber);
    if (idx !== -1) {
      this.inspectedRoundIndex = idx;
    }
  }

  selectRoundByIndex(idx: number): void {
    if (idx < 0 || idx >= this.rounds.length) return;
    this.inspectedRoundIndex = idx;
    this.selectedRoundNumber = this.rounds[idx].round;
  }

  hoverRoundIndex(idx: number): void {
    if (idx >= 0 && idx < this.rounds.length) {
      this.inspectedRoundIndex = idx;
    }
  }

  prevRound(): void {
    const idx = this.rounds.findIndex(r => r.round === this.selectedRoundNumber);
    if (idx > 0) {
      this.selectRoundByIndex(idx - 1);
    }
  }

  nextRound(): void {
    const idx = this.rounds.findIndex(r => r.round === this.selectedRoundNumber);
    if (idx !== -1 && idx < this.rounds.length - 1) {
      this.selectRoundByIndex(idx + 1);
    }
  }

  get selectedRound(): SimulatorRaceRound | undefined {
    return this.rounds.find(r => r.round === this.selectedRoundNumber) || this.rounds[0];
  }

  get inspectedRoundTick(): SimChartRoundTick | undefined {
    return this.comparisonChart?.rounds[this.inspectedRoundIndex];
  }

  // --- Gestione Posizioni Gara con Smart Swap ---
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
    const maxLen = this.rules.racePoints.length;
    while (r.racePositions.length < maxLen) {
      r.racePositions.push(undefined);
    }

    const oldOccupant = r.racePositions[index];
    const newOccupant = value || undefined;

    // Smart Swap: in modalità Piloti, se il pilota scelto occupava già un'altra posizione a punti in questa gara,
    // scambialo automaticamente con il pilota che era in questa posizione!
    if (newOccupant && this.mode === 'drivers') {
      const existingIdx = r.racePositions.findIndex((id, idx) => id === newOccupant && idx !== index);
      if (existingIdx !== -1) {
        r.racePositions[existingIdx] = oldOccupant;
      }
    }

    r.racePositions[index] = newOccupant;
    r.raceWinnerId = r.racePositions[0];
    r.raceSecondId = r.racePositions[1];
    r.raceThirdId = r.racePositions[2];

    if (newOccupant && r.dnfContenderIds) {
      r.dnfContenderIds = r.dnfContenderIds.filter(id => id !== newOccupant);
    }

    r.isModified = true;
    this.recalculate();
  }

  // --- Gestione Posizioni Sprint con Smart Swap ---
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
    const maxLen = this.rules.sprintPoints.length;
    while (r.sprintPositions.length < maxLen) {
      r.sprintPositions.push(undefined);
    }

    const oldOccupant = r.sprintPositions[index];
    const newOccupant = value || undefined;

    if (newOccupant && this.mode === 'drivers') {
      const existingIdx = r.sprintPositions.findIndex((id, idx) => id === newOccupant && idx !== index);
      if (existingIdx !== -1) {
        r.sprintPositions[existingIdx] = oldOccupant;
      }
    }

    r.sprintPositions[index] = newOccupant;
    r.sprintWinnerId = r.sprintPositions[0];

    if (newOccupant && r.dnfContenderIds) {
      r.dnfContenderIds = r.dnfContenderIds.filter(id => id !== newOccupant);
    }

    r.isModified = true;
    this.recalculate();
  }

  setFastestLap(r: SimulatorRaceRound, driverId: string | undefined): void {
    r.fastestLapDriverId = driverId || undefined;
    r.isModified = true;
    this.recalculate();
  }

  // --- Azioni Rapide sul Singolo Round ---
  swapTopTwoInRound(r: SimulatorRaceRound): void {
    const p1 = this.getRacePosition(r, 0);
    const p2 = this.getRacePosition(r, 1);
    if (!p1 && !p2) return;
    this.setRacePosition(r, 0, p2);
    this.setRacePosition(r, 1, p1);
  }

  assignLeaderWinInRound(r: SimulatorRaceRound): void {
    const leaderId = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const secondId = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!leaderId) return;
    this.setRacePosition(r, 0, leaderId);
    if (secondId) this.setRacePosition(r, 1, secondId);
  }

  assignRivalWinInRound(r: SimulatorRaceRound): void {
    const leaderId = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const secondId = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!secondId) return;
    this.setRacePosition(r, 0, secondId);
    if (leaderId) this.setRacePosition(r, 1, leaderId);
  }

  // --- Gestione DNF / Zero Punti (con scalata automatica posizioni) ---
  isContenderDnf(r: SimulatorRaceRound, id: string): boolean {
    return !!r.dnfContenderIds && r.dnfContenderIds.includes(id);
  }

  addDnfContender(r: SimulatorRaceRound, id: string | undefined): void {
    if (!id) return;
    if (!r.dnfContenderIds) r.dnfContenderIds = [];
    if (!r.dnfContenderIds.includes(id)) {
      r.dnfContenderIds.push(id);
    }

    // Se il pilota era nei punti, rimuovilo e fai scalare di 1 posto i piloti dietro di lui!
    if (r.racePositions) {
      const maxLen = this.rules.racePoints.length;
      const filtered = r.racePositions.filter(p => p && p !== id);
      // Se è una gara già disputata con ordine reale completo oltre la P10, pesca il primo fuori dai punti che non sia DNF
      const realOrder = this.mode === 'drivers' ? (r.realRaceOrder || []) : (r.realConstructorRaceOrder || []);
      for (const candidate of realOrder) {
        if (filtered.length >= maxLen) break;
        if (candidate && candidate !== id && !r.dnfContenderIds.includes(candidate) && !filtered.includes(candidate)) {
          filtered.push(candidate);
        }
      }
      while (filtered.length < maxLen) {
        filtered.push(undefined);
      }
      r.racePositions = filtered.slice(0, maxLen);
      r.raceWinnerId = r.racePositions[0];
      r.raceSecondId = r.racePositions[1];
      r.raceThirdId = r.racePositions[2];
    }

    if (r.sprintPositions) {
      r.sprintPositions = r.sprintPositions.map(p => (p === id ? undefined : p));
      r.sprintWinnerId = r.sprintPositions[0];
    }

    if (r.fastestLapDriverId === id) {
      r.fastestLapDriverId = undefined;
    }

    r.isModified = true;
    this.selectedDnfForRound[r.round] = undefined;
    this.recalculate();
  }

  removeDnfContender(r: SimulatorRaceRound, id: string): void {
    if (!r.dnfContenderIds) return;
    r.dnfContenderIds = r.dnfContenderIds.filter(x => x !== id);
    r.isModified = true;
    this.recalculate();
  }

  getContenderName(id: string | undefined): string {
    if (!id) return 'Non assegnato';
    const opt = this.contenderOptions.find(o => o.value === id);
    return opt ? opt.label : id;
  }

  getContenderShortName(id: string | undefined): string {
    if (!id) return '—';
    const opt = this.contenderOptions.find(o => o.value === id);
    return opt ? opt.shortLabel : id;
  }

  getContenderColor(id: string | undefined): string {
    if (!id) return '#64748b';
    const opt = this.contenderOptions.find(o => o.value === id);
    return opt ? opt.color : '#64748b';
  }

  isOptionDisabled(r: SimulatorRaceRound, optValue: string, currentPosIdx: number, type: 'race' | 'sprint'): boolean {
    if (this.isContenderDnf(r, optValue)) return true;
    if (this.mode === 'constructors') {
      const positions = type === 'race' ? (r.racePositions || []) : (r.sprintPositions || []);
      const occurrences = positions.filter((p, idx) => p === optValue && idx !== currentPosIdx).length;
      return occurrences >= 2;
    }
    return false;
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

  // --- Ripristino singolo round o intera stagione ---
  clearRound(r: SimulatorRaceRound): void {
    if (r.isCompleted) {
      this.populateRoundFromReal(r, this.rules);
    } else {
      r.raceWinnerId = undefined;
      r.raceSecondId = undefined;
      r.raceThirdId = undefined;
      r.fastestLapDriverId = undefined;
      r.sprintWinnerId = undefined;
      r.racePositions = [];
      r.sprintPositions = [];
      r.dnfContenderIds = [];
      r.isModified = false;
    }
    this.selectedDnfForRound[r.round] = undefined;
    this.recalculate();
  }

  resetSimulation(): void {
    this.activeQuickScenarioId = null;
    const rules = this.rules;
    for (const r of this.rounds) {
      if (r.isCompleted) {
        this.populateRoundFromReal(r, rules);
      } else {
        r.raceWinnerId = undefined;
        r.raceSecondId = undefined;
        r.raceThirdId = undefined;
        r.fastestLapDriverId = undefined;
        r.sprintWinnerId = undefined;
        r.racePositions = [];
        r.sprintPositions = [];
        r.dnfContenderIds = [];
        r.isModified = false;
      }
    }
    this.selectedDnfForRound = {};
    this.recalculate();
  }

  // --- Applicazione Bivio Storico ("What If") sul vero Round della stagione ---
  applyHistoricalPivot(pivot: HistoricalPivot): void {
    this.resetSimulation();
    this.activeQuickScenarioId = pivot.id;

    const targetRound = this.rounds.find(r => r.round === pivot.round);
    if (!targetRound) return;

    const maxLen = this.rules.racePoints.length;
    if (!targetRound.racePositions) targetRound.racePositions = [];
    while (targetRound.racePositions.length < maxLen) {
      targetRound.racePositions.push(undefined);
    }

    if (pivot.positionsOverride) {
      for (const [posStr, driverId] of Object.entries(pivot.positionsOverride)) {
        const posIdx = Number(posStr);
        if (posIdx >= 0 && posIdx < maxLen) {
          this.setRacePosition(targetRound, posIdx, driverId);
        }
      }
    } else {
      if (pivot.winnerId) this.setRacePosition(targetRound, 0, pivot.winnerId);
      if (pivot.secondId) this.setRacePosition(targetRound, 1, pivot.secondId);
    }

    if (pivot.dnfIds?.length) {
      for (const dnfId of pivot.dnfIds) {
        this.addDnfContender(targetRound, dnfId);
      }
    }

    if (pivot.fastestLapId && this.rules.hasFastestLapPoint) {
      targetRound.fastestLapDriverId = pivot.fastestLapId;
    }

    targetRound.isModified = true;
    this.selectRound(targetRound.round);
    this.recalculate();
  }

  // --- Preset Scenari Stagionali (applicati sui round reali o rimanenti) ---
  private getTargetRoundsForScenario(): SimulatorRaceRound[] {
    const uncompleted = this.rounds.filter(r => !r.isCompleted);
    if (uncompleted.length > 0) return uncompleted;
    // Se tutte le gare sono già state disputate (stagione conclusa), applica sulle ultime 3 gare della stagione
    return this.rounds.slice(Math.max(0, this.rounds.length - 3));
  }

  presetAllWinsToLeader(): void {
    this.resetSimulation();
    this.activeQuickScenarioId = 'leader-dominance';

    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const second = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!leader) return;

    const targets = this.getTargetRoundsForScenario();
    for (const r of targets) {
      this.setRacePosition(r, 0, leader);
      if (second) this.setRacePosition(r, 1, second);
      if (this.rules.hasFastestLapPoint) {
        r.fastestLapDriverId = leader;
      }
      if (r.hasSprint) {
        this.setSprintPosition(r, 0, leader);
        if (second) this.setSprintPosition(r, 1, second);
      }
      r.isModified = true;
    }
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  presetAllWinsToSecond(): void {
    this.resetSimulation();
    this.activeQuickScenarioId = 'chaser-comeback';

    const second = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    if (!second) return;

    const targets = this.getTargetRoundsForScenario();
    for (const r of targets) {
      this.setRacePosition(r, 0, second);
      if (leader) this.setRacePosition(r, 1, leader);
      if (this.rules.hasFastestLapPoint) {
        r.fastestLapDriverId = second;
      }
      if (r.hasSprint) {
        this.setSprintPosition(r, 0, second);
        if (leader) this.setSprintPosition(r, 1, leader);
      }
      r.isModified = true;
    }
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  presetLeaderDnf(): void {
    this.resetSimulation();
    this.activeQuickScenarioId = 'leader-dnf';

    const leader = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const second = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!leader) return;

    const targets = this.getTargetRoundsForScenario();
    targets.forEach((r, idx) => {
      if (idx === 0) {
        // Ritiro a 0 punti nel round chiave
        this.addDnfContender(r, leader);
      } else if (leader) {
        this.setRacePosition(r, 1, leader);
      }
      if (second) {
        this.setRacePosition(r, 0, second);
        if (this.rules.hasFastestLapPoint) {
          r.fastestLapDriverId = second;
        }
        if (r.hasSprint) {
          this.setSprintPosition(r, 0, second);
        }
      }
      r.isModified = true;
    });
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  flagUrl(country: string): string {
    const code = countryNameToCode(country);
    return code ? smallFlagUrl(code) : '';
  }

  get remainingSimulatableRounds(): SimulatorRaceRound[] {
    return this.rounds.filter(r => !r.isCompleted);
  }

  get modifiedRoundsCount(): number {
    return this.rounds.filter(r => r.isModified).length;
  }

  get rules(): SeasonScoringRules {
    return getSeasonScoringRules(this.season || 2024);
  }

  get allRacePositionIndices(): number[] {
    return this.rules.racePoints.map((_, i) => i);
  }

  get allSprintPositionIndices(): number[] {
    return this.rules.sprintPoints.map((_, i) => i);
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

  /**
   * Restituisce i punti calcolati nel round selezionato per un dato contendente
   */
  getRoundPointsForContender(r: SimulatorRaceRound, contenderId: string): { real: number; sim: number; delta: number } {
    const realRec = this.mode === 'drivers' ? (r.realDriverPoints || {}) : (r.realConstructorPoints || {});
    const real = r.isCompleted ? (realRec[contenderId] ?? 0) : 0;

    if (r.isCompleted && !r.isModified) {
      return { real, sim: real, delta: 0 };
    }

    const driverToConstructor = new Map<string, string>();
    for (const d of this.driverStandings) {
      driverToConstructor.set(d.driverId, d.constructorId);
    }
    const { points } = computeConfiguredRoundPoints(r, this.rules, this.mode, driverToConstructor);
    const sim = points.get(contenderId) ?? 0;
    return { real, sim, delta: Math.round((sim - real) * 10) / 10 };
  }
}
