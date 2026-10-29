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
  private loadSeq = 0;

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
  scenarioScopeCount: 3 | 5 | 'all' = 3;
  scenarioAppliedSummary: string | null = null;

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
      return;
    }

    if (
      changes['driverStandings'] ||
      changes['constructorStandings'] ||
      changes['seasonRounds'] ||
      changes['isCurrentSeason']
    ) {
      if (this.rounds.length > 0) {
        this.syncRealResultsIntoRounds();
        this.updateContenderOptions();
        this.ensureDefaultVisibleContenders();
        this.recalculate();
      } else if (this.schedule.length > 0) {
        this.initializeRounds();
        this.updateContenderOptions();
        this.ensureDefaultVisibleContenders();
        this.recalculate();
      }
    }
  }

  async loadSchedule(): Promise<void> {
    if (!this.season) return;
    const targetSeason = this.season;
    const seq = ++this.loadSeq;

    // Pulisce subito i round della stagione precedente per evitare qualsiasi contaminazione tra stagioni
    this.loading = true;
    this.schedule = [];
    this.rounds = [];
    this.simulationResult = null;
    this.comparisonChart = null;
    this.activeQuickScenarioId = null;
    this.scenarioAppliedSummary = null;
    this.visibleContenderIds.clear();
    this.historicalPivotsForSeason = FAMOUS_HISTORICAL_PIVOTS.filter(p => p.season === targetSeason);

    try {
      const scheduleItems = await this.jolpica.getSeasonSchedule(targetSeason);
      if (seq !== this.loadSeq) return;

      this.schedule = scheduleItems;
      this.initializeRounds();
      this.updateContenderOptions();
      this.ensureDefaultVisibleContenders();
      this.recalculate();
    } catch {
      if (seq !== this.loadSeq) return;
      this.schedule = [];
      this.rounds = [];
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
      }
    }
  }

  setMode(mode: 'drivers' | 'constructors'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.activeQuickScenarioId = null;
    this.scenarioAppliedSummary = null;
    this.initializeRounds();
    this.updateContenderOptions();
    this.visibleContenderIds.clear();
    this.ensureDefaultVisibleContenders();
    this.recalculate();
  }

  setEditorViewMode(viewMode: 'single' | 'grid'): void {
    this.editorViewMode = viewMode;
  }

  setScenarioScopeCount(scope: 3 | 5 | 'all'): void {
    this.scenarioScopeCount = scope;
    // Se c'è uno scenario rapido attivo, riapplicalo subito con il nuovo numero di gare
    if (this.activeQuickScenarioId === 'leader-dominance') {
      this.presetAllWinsToLeader();
    } else if (this.activeQuickScenarioId === 'chaser-comeback') {
      this.presetAllWinsToSecond();
    } else if (this.activeQuickScenarioId === 'leader-dnf') {
      this.presetLeaderDnf();
    } else if (this.activeQuickScenarioId === 'swap-top-two') {
      this.presetSwapTopTwo();
    }
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

    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastSeason = !this.isCurrentSeason || this.season < currentYear;

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

      // In qualsiasi stagione passata (o per gare con data già trascorsa), il round è SEMPRE completato,
      // mai considerato "gara futura mancante".
      const isCompleted = isPastSeason || hasRealData || (Boolean(item.date) && item.date < todayStr);

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
   * Quando seasonRounds viene caricato in modo asincrono, aggiorna i dati reali nei round
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

  /**
   * Promuove un pilota/team al 1° posto di una gara facendo scalare di 1 posizione chi gli stava davanti,
   * senza mai promuovere artificialmente gli avversari che erano arrivati più indietro.
   */
  private promoteContenderToFirst(r: SimulatorRaceRound, winnerId: string, secondIfFuture?: string): void {
    const maxLen = this.rules.racePoints.length;
    if (!r.isCompleted || !r.racePositions || r.racePositions.every(p => !p)) {
      // Gara futura senza ordine reale: imposta 1° e 2°
      this.setRacePosition(r, 0, winnerId);
      if (secondIfFuture && secondIfFuture !== winnerId) {
        this.setRacePosition(r, 1, secondIfFuture);
      }
      return;
    }

    // Gara con ordine reale: rimuovi winnerId dalla sua posizione attuale e inseriscilo in P1 (indice 0),
    // facendo scivolare di 1 posto tutti coloro che erano davanti a lui
    const currentOrder = [...r.racePositions];
    const existingIdx = currentOrder.indexOf(winnerId);
    if (existingIdx === 0) {
      // Era già 1°: se vogliamo che secondIfFuture sia 2° solo se era davanti, non serve cambiare P1
      r.isModified = true;
      return;
    }

    if (existingIdx !== -1) {
      currentOrder.splice(existingIdx, 1);
    }
    currentOrder.unshift(winnerId);
    r.racePositions = currentOrder.slice(0, maxLen);
    r.raceWinnerId = r.racePositions[0];
    r.raceSecondId = r.racePositions[1];
    r.raceThirdId = r.racePositions[2];
    if (r.dnfContenderIds) {
      r.dnfContenderIds = r.dnfContenderIds.filter(id => id !== winnerId);
    }
    r.isModified = true;
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
    if (!r.racePositions) r.racePositions = [];
    r.racePositions[0] = p2;
    r.racePositions[1] = p1;
    r.raceWinnerId = r.racePositions[0];
    r.raceSecondId = r.racePositions[1];
    r.isModified = true;
    this.recalculate();
  }

  assignLeaderWinInRound(r: SimulatorRaceRound): void {
    const leaderId = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const secondId = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!leaderId) return;
    this.promoteContenderToFirst(r, leaderId, secondId);
    this.recalculate();
  }

  assignRivalWinInRound(r: SimulatorRaceRound): void {
    const leaderId = this.mode === 'drivers'
      ? this.driverStandings[0]?.driverId
      : this.constructorStandings[0]?.constructorId;
    const secondId = this.mode === 'drivers'
      ? this.driverStandings[1]?.driverId
      : this.constructorStandings[1]?.constructorId;
    if (!secondId) return;
    this.promoteContenderToFirst(r, secondId, leaderId);
    this.recalculate();
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

    if (r.racePositions) {
      const maxLen = this.rules.racePoints.length;
      const filtered = r.racePositions.filter(p => p && p !== id);
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
    this.scenarioAppliedSummary = null;
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
      if (pivot.winnerId) this.promoteContenderToFirst(targetRound, pivot.winnerId, pivot.secondId);
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
    this.scenarioAppliedSummary = `Bivio storico applicato sul Round ${targetRound.round} (${targetRound.locality})`;
    this.selectRound(targetRound.round);
    this.recalculate();
  }

  // --- Helper per selezionare le N gare target dello scenario ---
  private sliceByScope(list: SimulatorRaceRound[], fromEnd = false): SimulatorRaceRound[] {
    if (this.scenarioScopeCount === 'all') return list;
    const count = this.scenarioScopeCount;
    if (fromEnd) {
      return list.slice(Math.max(0, list.length - count));
    }
    return list.slice(0, count);
  }

  private formatRoundsSummary(label: string, modified: SimulatorRaceRound[]): string {
    if (!modified.length) return label;
    const codes = modified.map(r => `R${r.round}`).join(', ');
    return `${label} su ${modified.length} ${modified.length === 1 ? 'gara' : 'gare'} (${codes})`;
  }

  /**
   * Scenario 1: Dominio Leader (il 1° vince le gare mancanti o, a stagione conclusa, vince anche le gare in cui non aveva vinto)
   */
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

    const uncompleted = this.rounds.filter(r => !r.isCompleted);
    let targets: SimulatorRaceRound[];

    if (uncompleted.length > 0) {
      targets = this.sliceByScope(uncompleted, false);
    } else {
      // Stagione conclusa: scegli le gare in cui il leader NON è arrivato 1° (così guadagna davvero punti!)
      const nonWonByLeader = this.rounds.filter(r => this.getRacePosition(r, 0) !== leader);
      const pool = nonWonByLeader.length > 0 ? nonWonByLeader : this.rounds;
      targets = this.sliceByScope(pool, true);
    }

    for (const r of targets) {
      this.promoteContenderToFirst(r, leader, second);
      if (this.rules.hasFastestLapPoint) {
        r.fastestLapDriverId = leader;
      }
      if (r.hasSprint && this.rules.hasSprint) {
        this.setSprintPosition(r, 0, leader);
        if (second && !r.isCompleted) this.setSprintPosition(r, 1, second);
      }
      r.isModified = true;
    }

    this.scenarioAppliedSummary = this.formatRoundsSummary('Dominio Leader applicato', targets);
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  /**
   * Scenario 2: Rimonta Inseguitore (il 2° vince le gare e batte il Leader, senza mai promuovere il Leader se era più indietro)
   */
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

    const uncompleted = this.rounds.filter(r => !r.isCompleted);
    let targets: SimulatorRaceRound[];

    if (uncompleted.length > 0) {
      targets = this.sliceByScope(uncompleted, false);
    } else {
      // Stagione conclusa: prendi le gare vinte dal Leader (o in cui l'Inseguitore non ha vinto) così il 2° ribalta davvero i punti sul 1°!
      const leaderWins = this.rounds.filter(r => this.getRacePosition(r, 0) === leader);
      const nonSecondWins = this.rounds.filter(r => this.getRacePosition(r, 0) !== second);
      const pool = leaderWins.length > 0 ? leaderWins : (nonSecondWins.length > 0 ? nonSecondWins : this.rounds);
      targets = this.sliceByScope(pool, true);
    }

    for (const r of targets) {
      this.promoteContenderToFirst(r, second, leader);
      if (this.rules.hasFastestLapPoint) {
        r.fastestLapDriverId = second;
      }
      if (r.hasSprint && this.rules.hasSprint) {
        this.setSprintPosition(r, 0, second);
        if (leader && !r.isCompleted) this.setSprintPosition(r, 1, leader);
      }
      r.isModified = true;
    }

    this.scenarioAppliedSummary = this.formatRoundsSummary('Rimonta Inseguitore applicata', targets);
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  /**
   * Scenario 3: Crisi Leader (Ritiro a 0 pt DNF per il Leader su TUTTE le N gare selezionate, non una sola!)
   */
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

    const uncompleted = this.rounds.filter(r => !r.isCompleted);
    let targets: SimulatorRaceRound[];

    if (uncompleted.length > 0) {
      targets = this.sliceByScope(uncompleted, false);
    } else {
      // Stagione conclusa: prendi le ultime N gare in cui il Leader è andato a punti
      const leaderScoredRounds = this.rounds.filter(r => {
        const ptsMap = this.mode === 'drivers' ? (r.realDriverPoints || {}) : (r.realConstructorPoints || {});
        return (ptsMap[leader] ?? 0) > 0 || (r.racePositions || []).includes(leader);
      });
      const pool = leaderScoredRounds.length > 0 ? leaderScoredRounds : this.rounds;
      targets = this.sliceByScope(pool, true);
    }

    for (const r of targets) {
      // Ritiro a 0 punti (DNF) per il Leader in ciascuna delle gare target!
      this.addDnfContender(r, leader);
      if (second) {
        this.promoteContenderToFirst(r, second);
        if (this.rules.hasFastestLapPoint) {
          r.fastestLapDriverId = second;
        }
        if (r.hasSprint && this.rules.hasSprint) {
          this.setSprintPosition(r, 0, second);
        }
      }
      r.isModified = true;
    }

    this.scenarioAppliedSummary = this.formatRoundsSummary('Ritiro 0 pt Leader applicato', targets);
    if (targets.length > 0) {
      this.selectRound(targets[0].round);
    }
    this.recalculate();
  }

  /**
   * Scenario 4: Inverti 1° e 2° posto reale nelle gare selezionate
   */
  presetSwapTopTwo(): void {
    this.resetSimulation();
    this.activeQuickScenarioId = 'swap-top-two';

    const completed = this.rounds.filter(r => r.isCompleted && this.getRacePosition(r, 0) && this.getRacePosition(r, 1));
    const pool = completed.length > 0 ? completed : this.rounds;
    const targets = this.sliceByScope(pool, true);

    for (const r of targets) {
      this.swapTopTwoInRound(r);
    }

    this.scenarioAppliedSummary = this.formatRoundsSummary('Inversione 1°-2° applicata', targets);
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

  get isWaitingForRealRounds(): boolean {
    return this.loading || (this.roundsLoading && (!this.seasonRounds || this.seasonRounds.length === 0));
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
