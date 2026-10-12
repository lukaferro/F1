# Jolpica: statistiche di carriera nel dettaglio pilota — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire le statistiche di carriera estratte da Wikipedia con dati Jolpica (riquadri, tabella stagione per stagione, grafico delle posizioni finali).

**Architecture:** `JolpicaService` riceve i metodi per abbinare un pilota OpenF1 al `driverId` Jolpica, contare i risultati di carriera (`MRData.total` con `limit=1`) ed elencare le stagioni corse; la posizione di ogni stagione arriva da `getDriverStandings(season)`, già in cache per la pagina Classifiche. Un nuovo `DriverCareerComponent` possiede caricamento, errori, riquadri, tabella e grafico SVG (geometria calcolata da una funzione pura); `DriverDetailComponent` perde tutto il parsing di Wikipedia e tiene solo la biografia.

**Tech Stack:** Angular 21 (standalone, `@if/@for`, `@Input/@Output`), PrimeNG 21, Vitest + jsdom (`ng test`), `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-12-jolpica-carriera-pilota-design.md`

## Global Constraints

- Base URL Jolpica: `https://api.jolpi.ca/ergast/f1`; ogni percorso termina con `/`; dati sotto `MRData`; conteggi da `MRData.total`.
- L'abbinamento cerca solo nelle stagioni dalla corrente al 2023 (`FIRST_OPENF1_SEASON = 2023`).
- Titolo = stagione conclusa con posizione 1. Anno < anno corrente: sempre conclusa; anno corrente: conclusa solo se `getStandingsRound(anno) === getSeasonRaceCount(anno)`.
- Punti di carriera = somma dei punti delle classifiche di stagione (includono le sprint), mai dei risultati di gara.
- Punti e Titoli si mostrano solo quando tutte le stagioni sono caricate; se una stagione è in errore mostrano "—".
- Testi esatti: "Questo pilota non ha ancora disputato gare in F1."; etichetta stagione in corso "in corso"; titoli sezione "Statistiche Carriera", "Stagione per stagione", "Posizione finale".
- Avviso Jolpica: `<app-api-unavailable source="jolpica">` (componente esistente).
- Nessuna nuova dipendenza npm: il grafico è SVG inline.
- Commenti nel codice in italiano. **Nessuna attribuzione a Claude nei commit** (niente `Co-Authored-By`, niente "Generated with").
- Comandi: test `npx ng test --watch=false`, build `npm run build`.

## Review Focus

- Pilota elencato in una stagione ma assente dalla sua classifica (es. stagione in corso prima della prima gara, o solo prove libere): la riga mostra "—" in Pos./Punti, non è un errore e non blocca Punti/Titoli → test in Task 2.
- Primo posto nella stagione in corso non ancora conclusa: non conta come titolo e la riga non è dorata → test in Task 2.
- Navigazione da un pilota a un altro mentre le stagioni del primo stanno ancora arrivando: le righe del primo non finiscono nel secondo → test in Task 2.
- Sigla OpenF1 che non coincide con `code` Jolpica (o `code` assente): abbinamento per cognome senza accenti (es. "Nico HÜLKENBERG" ↔ `Hülkenberg`) → test in Task 1.
- Carriere con buchi (es. Hülkenberg 2020→2022, Bearman 2024 con una sola gara): il grafico usa l'anno sull'asse X, quindi il buco si vede, e le etichette non si sovrappongono → test in Task 3.

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/app/services/jolpica.service.ts` (modifica) | `findDriver`, `getCareerTotals`, `getDriverSeasons`, `getSeasonRaceCount`, `getStandingsRound`; campo `constructors` in `DriverStanding` |
| `src/app/services/jolpica.service.spec.ts` (modifica) | test dei nuovi metodi |
| `src/app/components/driver-career/driver-career.component.{ts,html,css,spec.ts}` (nuovi) | sezione carriera: caricamento, riquadri, tabella, grafico |
| `src/app/utils/position-chart.ts` + `.spec.ts` (nuovi) | geometria del grafico (funzione pura) |
| `src/app/utils/nationality.ts` + `.spec.ts` (nuovi) | nazionalità Jolpica → codice paese a 3 lettere |
| `src/app/components/driver-detail/driver-detail.component.{ts,html,css}` (modifica) | rimozione parsing Wikipedia, uso di `<app-driver-career>` |

---

### Task 1: nuovi metodi di `JolpicaService`

**Files:**
- Modify: `src/app/services/jolpica.service.ts`
- Test: `src/app/services/jolpica.service.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface DriverStanding { /* campi esistenti invariati */ constructors: { id: string; name: string }[]; }
  export interface CareerTotals {
    races: number; wins: number; podiums: number; poles: number; fastestLaps: number;
    debut?: { season: number; raceName: string };   // assente se races === 0
  }
  export interface JolpicaDriverMatch { driverId: string; nationality: string; }
  export const FIRST_OPENF1_SEASON = 2023;
  class JolpicaService {
    findDriver(acronym: string, fullName: string): Promise<JolpicaDriverMatch | null>;
    getCareerTotals(driverId: string): Promise<CareerTotals>;
    getDriverSeasons(driverId: string): Promise<number[]>;        // decrescente
    getSeasonRaceCount(season: number): Promise<number>;
    getStandingsRound(season: number): Promise<number>;           // 0 se classifica vuota
  }
  ```
- URL esatti (l'ordine dei parametri conta per la cache e per i test):
  - elenco piloti: `${BASE_URL}/${season}/drivers/?limit=100`
  - totali: `${BASE_URL}/drivers/${id}/results/?limit=1`, `.../results/1/?limit=1`, `.../results/2/?limit=1`, `.../results/3/?limit=1`, `.../qualifying/1/?limit=1`, `.../fastest/1/results/?limit=1`
  - stagioni: `${BASE_URL}/drivers/${id}/seasons/?limit=100`
  - calendario: `${BASE_URL}/${season}/races/?limit=1`
  - round: la prima pagina di `getDriverStandings` (`${BASE_URL}/${season}/driverstandings/?limit=100&offset=0`), letta da `StandingsLists[0].round`.

- [ ] **Step 1: Scrivi i test** in `jolpica.service.spec.ts` (stesso helper `request()` già presente):
  - `'adds every constructor of the season'` — riga con `Constructors` `[rb, red_bull]` → `constructors` uguale a `[{ id: 'rb', name: 'RB F1 Team' }, { id: 'red_bull', name: 'Red Bull' }]` e `constructorId` resta `'red_bull'`.
  - `'finds a driver by code in the most recent season'` — `findDriver('VER', 'Max VERSTAPPEN')`; la richiesta `${API}/<anno corrente>/drivers/?limit=100` risponde con `{ driverId: 'max_verstappen', code: 'VER', familyName: 'Verstappen', nationality: 'Dutch' }` → `{ driverId: 'max_verstappen', nationality: 'Dutch' }` e nessun'altra richiesta.
  - `'falls back to earlier seasons and to the family name without accents'` — anno corrente: elenco senza il pilota; anno precedente: `{ driverId: 'hulkenberg', familyName: 'Hülkenberg' }` senza `code` → `findDriver('HUL', 'Nico HULKENBERG')` restituisce `driverId: 'hulkenberg'`.
  - `'returns null when no season since 2023 has the driver'` — tutte le stagioni dalla corrente al 2023 rispondono con elenco vuoto → `null`.
  - `'reads career totals from MRData.total'` — totali 397, 106, 50, 44, 119, 69 (GP, P1, P2, P3, pole, giri veloci) e prima gara `{ season: '2007', raceName: 'Australian Grand Prix' }` → `{ races: 397, wins: 106, podiums: 200, poles: 119, fastestLaps: 69, debut: { season: 2007, raceName: 'Australian Grand Prix' } }`.
  - `'has no debut when the driver has no races'` — tutti i `total` a `'0'`, `Races: []` → `debut` `undefined`.
  - `'lists driver seasons from the most recent'` — `['2007', '2008', '2026']` → `[2026, 2008, 2007]`.
  - `'reads race count and standings round'` — `races/?limit=1` con `total: '24'` → 24; classifica con `StandingsLists: [{ round: '19', ... }]` → 19; classifica vuota → 0.

- [ ] **Step 2: Esegui** `npx ng test --watch=false` → i nuovi test falliscono (metodi inesistenti).

- [ ] **Step 3: Implementa** i metodi e il campo `constructors` in `jolpica.service.ts`. `findDriver` scorre gli anni dal corrente (`new Date().getFullYear()`) a `FIRST_OPENF1_SEASON` uno alla volta e si ferma al primo abbinamento; in ogni anno prima prova `code === acronym.toUpperCase()`, poi il cognome normalizzato (`normalize('NFD')`, via i diacritici, minuscolo) contenuto nel nome completo normalizzato. Un anno che risponde 404 conta come elenco vuoto. `getCareerTotals` lancia le sei richieste con `Promise.all`. Aggiungi `round?: string` al tipo `StandingsResponse`.

- [ ] **Step 4: Esegui** `npx ng test --watch=false` → verde, compresi i test esistenti di `jolpica.service.spec.ts` e `standings.component.spec.ts` (aggiorna l'helper `driver()` di quest'ultimo con `constructors: [{ id: 'ferrari', name: 'Ferrari' }]` se TypeScript lo richiede).

- [ ] **Step 5: Commit** — `feat: Jolpica career totals, driver seasons and driver lookup`

---

### Task 2: `DriverCareerComponent` (riquadri e tabella)

**Files:**
- Create: `src/app/components/driver-career/driver-career.component.ts`, `.html`, `.css`, `.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`findDriver`, `getCareerTotals`, `getDriverSeasons`, `getDriverStandings`, `getSeasonRaceCount`, `getStandingsRound`, `apiStatus`); `constructorColor(id): string` e `constructorLogo(id): ConstructorLogo | undefined` da `utils/constructor-branding.ts`.
- Produces:
  ```ts
  // selector: 'app-driver-career'
  export interface CareerSeason {
    season: number;
    state: 'loading' | 'ready' | 'error';
    position?: number; points?: number; wins?: number;   // assenti se il pilota non è nella classifica
    constructors: { id: string; name: string }[];
    inProgress: boolean;   // stagione corrente non conclusa
    champion: boolean;     // position === 1 && !inProgress
  }
  export class DriverCareerComponent implements OnChanges {
    @Input({ required: true }) acronym!: string;
    @Input({ required: true }) fullName!: string;
    @Output() nationality = new EventEmitter<string>();
    totals: CareerTotals | null;
    seasons: CareerSeason[];          // dalla più recente
    loading: boolean;                 // passi 1-2 in corso
    error: boolean;                   // passi 1-2 falliti
    notFound: boolean;                // pilota non trovato o races === 0
    get seasonsComplete(): boolean;   // nessuna riga 'loading'
    get seasonsFailed(): boolean;     // almeno una riga 'error'
    get totalPoints(): number | null; // null se !seasonsComplete || seasonsFailed
    get titleYears(): number[];       // crescente
    retry(): Promise<void>;
  }
  ```

- [ ] **Step 1: Scrivi i test** in `driver-career.component.spec.ts`, con un `JolpicaService` finto (`useValue`, come in `standings.component.spec.ts`) i cui metodi restituiscono promesse controllabili; dopo ogni passo `await fixture.whenStable(); fixture.detectChanges()`:
  - `'shows totals before the seasons arrive'` — stagioni che non si risolvono mai → nel DOM "106" (vittorie) e "200" (podi), Punti e Titoli con lo skeleton (`.career-item .skeleton`).
  - `'sums points and counts titles once every season is loaded'` — stagioni 2008 (P1, 98 punti) e 2007 (P2, 109) → `totalPoints` 207, `titleYears` `[2008]`, riga 2008 con classe `champion`.
  - `'does not count a title in the season in progress'` — anno corrente P1, `getStandingsRound` 19, `getSeasonRaceCount` 24 → `titleYears` `[]`, riga con testo "in corso", senza `champion`.
  - `'counts the current season once its last round is done'` — round 24 di 24 → titolo contato.
  - `'treats a driver missing from a season standings as ready, not failed'` — classifica senza il pilota → riga `state: 'ready'`, "—" in Pos., `totalPoints` non `null`.
  - `'hides totals and offers retry when a season fails'` — una classifica rifiutata → `totalPoints` `null`, Punti mostra "—", c'è un pulsante "Riprova"; dopo che la classifica torna valida, `retry()` richiama `getDriverStandings` solo per quella stagione e `totalPoints` diventa un numero.
  - `'shows the Jolpica notice when the lookup fails'` — `findDriver` rifiutata → `app-api-unavailable` presente; il suo `(retry)` riavvia il caricamento.
  - `'shows the no-races message'` — `findDriver` → `null` → "Questo pilota non ha ancora disputato gare in F1."; stesso messaggio con `races: 0`.
  - `'emits the Jolpica nationality'` — spia su `nationality.emit` chiamata con `'British'`.
  - `'ignores results of a previous driver'` — primo pilota con stagioni non risolte; cambio di `acronym`/`fullName` + `ngOnChanges`; poi si risolvono le stagioni del primo → `seasons` contiene solo quelle del secondo.
  - `'shows every constructor of a season'` — `constructors` `[rb, red_bull]` → testo "RB F1 Team / Red Bull" nella riga.

- [ ] **Step 2: Esegui** `npx ng test --watch=false` → falliscono (componente inesistente).

- [ ] **Step 3: Implementa il componente.**
  - `ngOnChanges` avvia `load()` quando cambia `acronym` o `fullName`. Ogni `load()` incrementa `private loadSeq` e ignora i risultati se nel frattempo è cambiato.
  - `load()`: `findDriver` → (`null` → `notFound`) → emette `nationality` → `Promise.all([getCareerTotals, getDriverSeasons])` (`races === 0` → `notFound`) → crea le righe `loading` dalla più recente e chiama `loadSeason(season)` per ognuna senza attendere in serie (la coda di `HttpCache` le distribuisce).
  - `loadSeason`: `getDriverStandings(season)` filtrata per `driverId`; per l'anno corrente anche `getSeasonRaceCount` e `getStandingsRound` per `inProgress`; errore → `state: 'error'`.
  - `retry()`: se `error` o manca il `driverId` rifà `load()`, altrimenti rilancia `loadSeason` solo sulle righe in errore.
  - Errori ai passi 1-2 → `error = true` (nessun uso di `apiStatus` per decidere: la cache può avere altri dati validi).

- [ ] **Step 4: Template e stili.**
  - Sezione `<section class="panel career-panel">` con `<h2>Statistiche Carriera</h2>`.
  - Riquadri nell'ordine: Esordio (`{{ raceName }} {{ season }}`), GP Disputati, Punti Totali, Pole Position, Vittorie, Podi, Giri Veloci, Titoli Mondiali. Sotto, se ci sono titoli, il riquadro largo "Anni Titoli" con un chip per anno.
  - Tabella `<table class="career-table">` con intestazioni Anno · Team · Pos. · Punti · Vittorie e `[style.--i]="$index"` sulle righe, per l'animazione già definita in `styles.css`: aggiungi `.career-table tbody tr` al selettore delle righe in dissolvenza.
  - Logo del team con `constructorLogo` (stesso markup `team-logo` della pagina Classifiche) e bordo sinistro della riga col colore `#` + `constructorColor(ultima squadra)`.
  - Le righe `loading` mostrano skeleton nelle celle numeriche; la classe `champion` dà lo sfondo oro.
  - Sposta in `driver-career.component.css` le regole `.career-*`, `.championship-years*` e `.stat-champs` da `driver-detail.component.css`, così riquadri e chip restano identici a oggi; le rimuoverai da lì in Task 4.

- [ ] **Step 5: Esegui** `npx ng test --watch=false` → verde.

- [ ] **Step 6: Commit** — `feat: driver career section with season-by-season table`

---

### Task 3: grafico "Posizione finale"

**Files:**
- Create: `src/app/utils/position-chart.ts`, `src/app/utils/position-chart.spec.ts`
- Modify: `src/app/components/driver-career/driver-career.component.{ts,html,css,spec.ts}`

**Interfaces:**
- Consumes: `CareerSeason` (Task 2).
- Produces:
  ```ts
  export interface ChartInput { season: number; position: number; color: string; inProgress: boolean; }
  export interface PositionChart {
    width: number; height: number;
    points: { x: number; y: number; season: number; position: number; color: string }[];
    segments: { x1: number; y1: number; x2: number; y2: number; dashed: boolean }[];
    yTicks: { y: number; label: string }[];   // 'P1', 'P5', 'P10', ...
    xLabels: { x: number; label: string }[];
    label: string;                            // testo per aria-label
  }
  export function buildPositionChart(input: ChartInput[], width?: number, height?: number): PositionChart | null;
  ```
- Valori fissati: `width` 640, `height` 220, margini sinistra 40, destra 16, sopra 16, sotto 28. Asse X proporzionale all'anno tra il primo e l'ultimo; asse Y da P1 (in alto) a `max(10, posizione peggiore)`. Tacche Y: P1 e i multipli di 5 fino al massimo. Etichette X: tutte fino a 12 stagioni, una ogni 2 da 13 a 24, una ogni 5 oltre 24, sempre compresa l'ultima. Etichetta: `"Posizione finale dal <primo> al <ultimo>, migliore: <n>ª"`.

- [ ] **Step 1: Scrivi i test** in `position-chart.spec.ts`:
  - `'returns null with fewer than two seasons'`.
  - `'puts P1 at the top and the worst position at the bottom'` — P1 e P20 → `y` di P1 = 16, `y` di P20 = 220 − 28.
  - `'uses at least P10 as the bottom of the scale'` — P1 e P3 → `yTicks` termina con `'P10'`.
  - `'spaces seasons by year so gaps stay visible'` — 2020, 2022, 2023 → la distanza x tra 2020 e 2022 è il doppio di quella tra 2022 e 2023.
  - `'sorts seasons chronologically'` — input dalla più recente → `points[0].season` è la più vecchia.
  - `'dashes the segment into the season in progress'` — ultimo punto `inProgress` → solo l'ultimo segmento ha `dashed: true`.
  - `'thins x labels on long careers'` — 20 stagioni consecutive → 10 etichette più l'ultima se non già inclusa; 26 stagioni → passo 5.
  - `'describes the chart for screen readers'` — `label` uguale a `'Posizione finale dal 2007 al 2026, migliore: 1ª'`.

- [ ] **Step 2: Esegui** `npx ng test --watch=false` → falliscono.

- [ ] **Step 3: Implementa `buildPositionChart`** in `position-chart.ts`.

- [ ] **Step 4: Usa il grafico nel componente.** Getter `chart: PositionChart | null` costruito dalle righe `ready` con `position` definita (colore `#` + `constructorColor` dell'ultima squadra). Nel template, sotto i riquadri e sopra la tabella, `<h3>Posizione finale</h3>` e `<svg [attr.viewBox]="'0 0 ' + chart.width + ' ' + chart.height" role="img" [attr.aria-label]="chart.label">` con linee guida orizzontali sulle tacche Y, segmenti (`stroke-dasharray="4 4"` se `dashed`), cerchi colorati con `<title>` "<anno>: P<n>", etichette. Larghezza `100%`, altezza automatica; colori di testo e griglia dalle variabili CSS esistenti del tema. Aggiungi al test del componente: `'draws the chart only with two or more ranked seasons'` (una sola stagione → nessun `svg.position-chart`; due → presente).

- [ ] **Step 5: Esegui** `npx ng test --watch=false` → verde.

- [ ] **Step 6: Commit** — `feat: final position chart in the driver career section`

---

### Task 4: integrazione nel dettaglio pilota e verifica nel browser

**Files:**
- Create: `src/app/utils/nationality.ts`, `src/app/utils/nationality.spec.ts`
- Modify: `src/app/components/driver-detail/driver-detail.component.ts`, `.html`, `.css`

**Interfaces:**
- Consumes: `DriverCareerComponent` (Task 2).
- Produces: `export function nationalityToCountryCode(nationality: string): string | undefined` — codici a 3 lettere come quelli di OpenF1 (`British` → `GBR`, `Dutch` → `NED`, `Monegasque` → `MON`, `Spanish` → `ESP`, `Mexican` → `MEX`, `Australian` → `AUS`, `Canadian` → `CAN`, `French` → `FRA`, `German` → `GER`, `Finnish` → `FIN`, `Danish` → `DEN`, `Thai` → `THA`, `Chinese` → `CHN`, `Japanese` → `JPN`, `American` → `USA`, `Italian` → `ITA`, `New Zealander` → `NZL`, `Argentine` → `ARG`, `Brazilian` → `BRA`, `Swiss` → `SUI`, `Belgian` → `BEL`, `Austrian` → `AUT`, `Polish` → `POL`, `Swedish` → `SWE`, `Russian` → `RUS`, `Indian` → `IND`, `Venezuelan` → `VEN`, `Colombian` → `COL`, `Estonian` → `EST`, `Israeli` → `ISR`); sconosciuta → `undefined`. Se aggiungi `EST` o `ISR`, aggiungili anche a `countryCodeMapping` del dettaglio pilota (`ee`, `il`).

- [ ] **Step 1: Scrivi i test** in `nationality.spec.ts`: `'maps Jolpica nationalities to country codes'` (`British` → `GBR`, `Monegasque` → `MON`, `New Zealander` → `NZL`) e `'returns undefined for an unknown nationality'`.

- [ ] **Step 2: Esegui** `npx ng test --watch=false` → falliscono; **implementa** `nationality.ts`; riesegui → verdi.

- [ ] **Step 3: Ripulisci `DriverDetailComponent`.**
  - Rimuovi `careerStats`, `loadingStats`, `loadWikipediaStats`, `parseWikipediaHtmlStats`, `cleanWikiValue`, `normalizeLabel`, `extractCountryCode`, `formatTeamEntry` e la copia locale di `wikiNameVariants` dentro `loadWikipediaInfo`, che ora usa il campo di classe.
  - In `loadWikipediaInfo` la condizione di uscita dai cicli diventa solo `this.wikiExtract`.
  - Nuovo metodo `onNationality(nationality: string): void`: se `this.driver` non ha `country_code`, lo imposta con `nationalityToCountryCode(nationality)`.
  - Importa `DriverCareerComponent`.

- [ ] **Step 4: Aggiorna il template.**
  - Sostituisci l'intera `<section class="panel career-panel">` con `<app-driver-career [acronym]="driver.name_acronym" [fullName]="driver.full_name" (nationality)="onNationality($event)" />`.
  - Nella bandiera, il ramo `@else if (loadingStats)` e il suo commento spariscono.
  - Rimuovi da `driver-detail.component.css` le regole spostate in Task 2.

- [ ] **Step 5: Esegui** `npx ng test --watch=false` e `npm run build` → tutto verde, build senza errori e senza nuovi warning di budget.

- [ ] **Step 6: Verifica nel browser** (`npm start`, puppeteer + Edge come finora, cache del sito svuotata):
  - `/drivers/HAM`: numeri prima della tabella; 20 righe; riga 2008 dorata; titoli 2008, 2014, 2015, 2017, 2018, 2019, 2020; grafico con 2008 in alto.
  - `/drivers/ANT`: stagione corrente "in corso" e tratteggiata nel grafico.
  - `/drivers/DEV`: una sola stagione, nessun grafico, nessun errore.
  - `/drivers/LAW`: riga 2025 con entrambe le squadre (nomi e ordine come li restituisce Jolpica).
  - Navigazione HAM → ANT durante il caricamento: nessuna riga di Hamilton in Antonelli.
  - Richieste a `api.jolpi.ca` bloccate con cache vuota: avviso Jolpica nella sola sezione carriera, biografia e scheda intatte.
  - Ricaricando `/drivers/HAM`: nessuna nuova richiesta a Jolpica.
  - Larghezza 375 px: tabella e grafico senza scroll orizzontale della pagina.

- [ ] **Step 7: Commit** — `feat: driver career stats from Jolpica instead of Wikipedia tables`
