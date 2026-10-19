# Jolpica: Gran Premi storici — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere consultabili tutti i Gran Premi dal 1950 (elenco per stagione, filtri paese/circuito, vincitori) e pagina di dettaglio storico con podio, foto, classifica ufficiale e qualifiche.

**Architecture:** `JolpicaService` espone l'elenco gare con vincitore (`getSeasonRaces`), i risultati completi di gara (`getRaceResults`) e le qualifiche (`getRaceQualifying`). Un nuovo `HistoricGranPremiDetailComponent` (`/granpremi/storico/:season/:round`) visualizza la testata dell'evento, il podio con foto Wikipedia dei primi 3 (tramite `WikipediaService`), la tabella completa dei risultati e le qualifiche. La pagina `GranPremiComponent` include nel selettore anni tutte le stagioni dal 1950, visualizzando per gli anni passati le card storiche con vincitore e link alla rotta storica.

**Tech Stack:** Angular 21 (standalone, `@if/@for`, `@Input/@Output`), PrimeNG 21, Vitest + jsdom, `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-19-jolpica-gran-premi-storici-design.md`

## Global Constraints

- Rotta storica: `granpremi/storico/:season/:round`; registrata in `app.routes.ts` **prima** di `granpremi/:id`.
- I Gran Premi dal 2023 restano gestiti da OpenF1 con rotta `granpremi/:id`.
- Link ai piloti nella classifica storica: stagione ≥ 2023 con `code` → `['/drivers', code]`; altrimenti `['/drivers', 'storico', driverId]`.
- Nomi dei paesi circuito di Jolpica tradotti o convertiti in codice ISO tramite `countryNameToCode` per la bandiera `flagUrl`.
- Foto del podio caricate via `WikipediaService.getImages` sui `wikiTitle` dei primi 3; iniziali su colore del team in caso di assenza o errore.
- Jolpica: coda a 550 ms e cache tramite `HttpCache`; nessuna richiesta ripetuta senza cache.
- Commenti in italiano. Nessuna attribuzione a Claude nei commit.
- Comandi: test `npx ng test --watch=false`, build `npm run build`.

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/app/utils/country-flags.ts` (+spec) | Mappatura paesi circuito (es. "Italy" → `ITA`) e nuovi codici (MAR) |
| `src/app/services/jolpica.service.ts` (+spec) | `getSeasonRaces`, `getRaceResults`, `getRaceQualifying` |
| `src/app/components/historic-gran-premi-detail/*` (nuovo) | Dettaglio GP storico con podio, classifica e qualifiche |
| `src/app/app.routes.ts` | Rotta `granpremi/storico/:season/:round` |
| `src/app/components/gran.premi/*` | Anni dal 1950, card storiche con vincitore e filtri |

---

### Task 1: Mappatura paesi e codici bandiere per circuiti Jolpica

**Files:**
- Modify: `src/app/utils/country-flags.ts`
- Test: `src/app/utils/country-flags.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export function countryNameToCode(countryName: string | undefined): string;
  ```
  Mappa i paesi dei circuiti Jolpica (es. "Italy" → "ITA", "UK" / "Great Britain" → "GBR", "USA" / "United States" → "USA", "Morocco" → "MAR", ecc.). Aggiunge a `COUNTRY_CODES`: `MAR: 'ma'`, `SUI: 'ch'`, `MCO: 'mc'`, `KOR: 'kr'`.

- [ ] **Step 1: Scrivi i test.**
  - `countryNameToCode('Italy')` → `'ITA'`, `countryNameToCode('UK')` → `'GBR'`, `countryNameToCode('United States')` → `'USA'`, `countryNameToCode('Morocco')` → `'MAR'`.
  - `countryNameToCode(undefined)` → `''`.
  - `flagUrl(countryNameToCode('Morocco'))` → `'https://flagcdn.com/w320/ma.png'`.
- [ ] **Step 2: Esegui** `npx ng test --watch=false` → falliscono.
- [ ] **Step 3: Implementa** `countryNameToCode` e aggiorna `COUNTRY_CODES` in `country-flags.ts`.
- [ ] **Step 4: Esegui** test → verdi.
- [ ] **Step 5: Commit** — `feat: circuit country mapping and flags for historic grand prix`

---

### Task 2: Metodi Jolpica per gare, risultati e qualifiche

**Files:**
- Modify: `src/app/services/jolpica.service.ts`
- Test: `src/app/services/jolpica.service.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface HistoricRaceSummary {
    season: number;
    round: number;
    raceName: string;
    circuitId: string;
    circuitName: string;
    locality: string;
    country: string;
    date: string;
    time?: string;
    url?: string;
    winner?: {
      driverId: string;
      code?: string;
      fullName: string;
      constructorId: string;
      constructorName: string;
      time?: string;
    };
  }

  export interface HistoricRaceResult {
    position: number;
    positionText: string;
    points: number;
    driverId: string;
    code?: string;
    fullName: string;
    nationality: string;
    wikiTitle?: string;
    constructorId: string;
    constructorName: string;
    grid: number;
    laps: number;
    status: string;
    time?: string;
  }

  export interface HistoricRaceDetail {
    season: number;
    round: number;
    raceName: string;
    circuitId: string;
    circuitName: string;
    locality: string;
    country: string;
    date: string;
    time?: string;
    url?: string;
    results: HistoricRaceResult[];
  }

  export interface HistoricQualifyingResult {
    position: number;
    driverId: string;
    code?: string;
    fullName: string;
    constructorId: string;
    constructorName: string;
    q1?: string;
    q2?: string;
    q3?: string;
  }

  JolpicaService.getSeasonRaces(season: number): Promise<HistoricRaceSummary[]>;
  JolpicaService.getRaceResults(season: number, round: number): Promise<HistoricRaceDetail | null>;
  JolpicaService.getRaceQualifying(season: number, round: number): Promise<HistoricQualifyingResult[]>;
  ```

- [ ] **Step 1: Scrivi i test.**
  - `getSeasonRaces(1988)`: chiama `1988/results/1/?limit=100`, restituisce array di gare con vincitore (Ayrton Senna, McLaren).
  - `getRaceResults(1950, 1)`: chiama `1950/1/results/?limit=100`, restituisce `HistoricRaceDetail` con Nino Farina P1, Luigi Fagioli P2, status, giri, tempi e punti.
  - `getRaceResults` su round inesistente o 404: restituisce `null`.
  - `getRaceQualifying(2006, 1)`: chiama `2006/1/qualifying/?limit=100`, restituisce risultati con Q1, Q2, Q3.
  - `getRaceQualifying` quando non ci sono qualifiche o 404: restituisce `[]`.
- [ ] **Step 2: Esegui** test → falliscono.
- [ ] **Step 3: Implementa** i metodi in `jolpica.service.ts`.
- [ ] **Step 4: Esegui** test → verdi.
- [ ] **Step 5: Commit** — `feat: Jolpica historic races, race results and qualifying endpoints`

---

### Task 3: Componente Dettaglio Gran Premio Storico e rotta

**Files:**
- Create: `src/app/components/historic-gran-premi-detail/historic-gran-premi-detail.component.{ts,html,css,spec.ts}`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Produces:
  Rotta: `{ path: 'granpremi/storico/:season/:round', component: HistoricGranPremiDetailComponent }` registrata prima di `granpremi/:id`.
  - Testata con nome gara, data, circuito, località, bandiera del paese e link Wikipedia.
  - Podio top 3 con medaglie/badge, foto dei piloti (da `WikipediaService.getImages` o fallback iniziali su colore del team), scuderie e tempi.
  - Tabella completa dei risultati (posizione, numero, pilota cliccabile, costruttore con colore, griglia con delta posizioni, giri, tempo/status, punti).
  - Sezione qualifiche visibile se `qualifyingResults.length > 0`.
  - Gestione stato caricamento (skeleton), 404 e avviso Jolpica.

- [ ] **Step 1: Scrivi i test.**
  - `'renders the historic race header and podium'`: stagione 1988 round 1 (Jacarepagua) con podio Prost, Mansell, Piquet; foto caricate o fallback iniziali.
  - `'links drivers to historic profile or current profile'`: pilota prima del 2023 → `['/drivers', 'storico', driverId]`.
  - `'shows full race classification table'`: righe con posizioni, status "Finished" vs ritiri ("Engine", ecc.).
  - `'shows qualifying table when data is available'`.
  - `'shows not found message for unknown race'`.
  - `'shows Jolpica unavailable banner on API error'`.
  - Route test: `/granpremi/storico/1988/1` carica `HistoricGranPremiDetailComponent`.
- [ ] **Step 2: Esegui** test → falliscono.
- [ ] **Step 3: Implementa** `HistoricGranPremiDetailComponent` e aggiungi la rotta in `app.routes.ts`.
- [ ] **Step 4: Esegui** test e build → verdi.
- [ ] **Step 5: Commit** — `feat: historic Grand Prix detail page with podium and full classification`

---

### Task 4: Anni dal 1950 e card storiche nella pagina Gran Premi

**Files:**
- Modify: `src/app/components/gran.premi/gran-premi.component.{ts,html,css,spec.ts}`

**Interfaces:**
- `years` include tutte le stagioni dal 1950 all'anno corrente (unione OpenF1 + Jolpica).
- Se `selectedYear < 2023`:
  - Carica `jolpicaService.getSeasonRaces(selectedYear)`.
  - Popola i dropdown `countries` e `circuits` con i paesi e circuiti di quella stagione storica.
  - Mostra card storiche con vincitore (nome, colore scuderia, tempo/distacco) e link a `['/granpremi', 'storico', race.season, race.round]`.
  - Filtri paese e circuito funzionano in tempo reale sulle gare della stagione storica.
- Se `selectedYear >= 2023` o nessun anno selezionato:
  - Mantiene l'elenco e i filtri attuali OpenF1.
- Gestione sequence number per ignorare risposte superate in caso di cambi rapidi d'anno.

- [ ] **Step 1: Scrivi i test.**
  - `'offers seasons from 1950 to current year in the year dropdown'`.
  - `'loads historic races with winner when year < 2023'`: anno 1988 → card con "Ayrton Senna", "McLaren", circuito e link storico.
  - `'filters historic races by country and circuit'`.
  - `'ignores responses from stale year selections'`.
  - `'keeps current OpenF1 behavior when year >= 2023'`.
  - `'shows Jolpica notice when historic season fails'`.
- [ ] **Step 2: Esegui** test → falliscono.
- [ ] **Step 3: Implementa** in `gran-premi.component.ts` e template.
- [ ] **Step 4: Esegui** test e build → verdi.
- [ ] **Step 5: Commit** — `feat: historic seasons and race cards in Gran Premi page`

---

### Task 5: Verifica nel browser e rifiniture

- [ ] **Step 1: Verifica nel browser** (dev server su localhost:4200):
  - Pagina Gran Premi default (gare recenti OpenF1).
  - Selezione anno 1988: elenco gare, vincitori (Senna, Prost), filtri paese e circuito.
  - Selezione anno 1950: prima stagione della storia della F1 (Silverstone, Monaco, ecc.).
  - Clic su una gara: apertura del dettaglio storico `/granpremi/storico/1988/1` con podio, foto Wikipedia, tabella risultati completa.
  - Clic su un pilota del podio o della tabella: navigazione corretta al dettaglio storico del pilota (`/drivers/storico/prost`).
  - Verifica anno moderno pre-2023 (es. 2012 o 2008) con presenza tab qualifiche.
  - Responsive su mobile (375 px).
- [ ] **Step 2: Esegui** test completi `npx ng test --watch=false` e build `npm run build`.
- [ ] **Step 3: Commit finale** e aggiornamento ledger.
