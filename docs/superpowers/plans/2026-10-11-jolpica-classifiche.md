# Jolpica: service di base e pagina Classifiche — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aggiungere la pagina `/classifiche` (piloti e costruttori, ogni stagione dal 1950) basata su Jolpica, con una cache HTTP condivisa con OpenF1.

**Architecture:** la logica di cache/coda/tentativi oggi dentro `Openf1ServiceService` viene spostata in una classe `HttpCache` senza dipendenze Angular, istanziata da ogni service con i propri limiti. `JolpicaService` la usa per le classifiche; `StandingsComponent` mostra podio e tabella e si aggancia alla griglia OpenF1 solo per foto e colori della stagione in corso.

**Tech Stack:** Angular 21 (componenti standalone, sintassi `@if/@for`), PrimeNG 21 (`p-select`, `p-button`), Vitest + jsdom (`ng test`), `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-11-jolpica-classifiche-design.md`

## Global Constraints

- Base URL Jolpica: `https://api.jolpi.ca/ergast/f1/`; ogni percorso termina con `/`; dati sotto `MRData`.
- Limiti Jolpica: pausa minima 260 ms tra le partenze, massimo 450 richieste per finestra di 3 600 000 ms.
- Limiti OpenF1 invariati: 350 ms, 28 richieste per 60 000 ms, TTL 24 h con `session_key`/`meeting_key=\d`, altrimenti 30 min.
- TTL Jolpica: 7 giorni (604 800 000 ms) per URL di una stagione conclusa (`/<anno>/` con anno < anno corrente), 1 h (3 600 000 ms) per tutto il resto (stagione in corso, `current`, elenco stagioni).
- `limit` massimo 100 per richiesta; paginare con `offset` quando `MRData.total` > 100.
- Classifica costruttori solo dal 1958; messaggio esatto: "Il campionato costruttori è stato istituito nel 1958."
- Stagione senza classifica: "Classifica non ancora disponibile per questa stagione."
- Avviso Jolpica: "L'archivio storico Jolpica non sta rispondendo. Riprova tra qualche istante."
- Link al dettaglio pilota (`/drivers/<code>`) solo per stagioni ≥ 2023 e solo se il pilota ha `code`.
- Commenti nel codice in italiano, come nel resto del progetto. Nessuna attribuzione a Claude nei commit.
- Comandi: test `npx ng test --watch=false`, build `npm run build`.

## Review Focus

- Cambio rapido di stagione (2025 poi subito 2024): la risposta di 2025 che arriva per ultima non deve sostituire i dati di 2024 → test in Task 3.
- Piloti storici senza `code` (es. 1988): nessun link, niente foto, riquadro con le iniziali → test in Task 3.
- Inizio stagione con `current/driverstandings/` vuoto: la pagina apre l'anno precedente invece di una classifica vuota → test in Task 2.
- Pilota che ha cambiato squadra in stagione (`Constructors` con più voci): si mostra l'ultima → test in Task 2.
- Molti cambi di stagione di fila oltre il limite orario: le richieste aspettano in coda invece di fallire → test della finestra in Task 1.

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/app/services/http-cache.ts` (nuovo) | cache memoria + `localStorage`, richieste condivise, coda con finestra, nuovi tentativi, stato |
| `src/app/services/http-cache.spec.ts` (nuovo) | test di `HttpCache` |
| `src/app/services/openf1-service.ts` (modifica) | usa `HttpCache`; API pubblica invariata |
| `src/app/services/jolpica.service.ts` (nuovo) | chiamate Jolpica, normalizzazione, paginazione |
| `src/app/services/jolpica.service.spec.ts` (nuovo) | test di `JolpicaService` |
| `src/app/utils/team-colors.ts` (modifica) | aggiunge `CONSTRUCTOR_COLORS` |
| `src/app/components/api-unavailable/*` (modifica) | input `source` |
| `src/app/components/standings/standings.component.{ts,html,css,spec.ts}` (nuovi) | pagina Classifiche |
| `src/app/app.routes.ts`, `src/app/app.component.html`, `src/app/components/footer/footer.component.html` (modifica) | rotta e navigazione |

---

### Task 1: `HttpCache` estratta da `Openf1ServiceService`

**Files:**
- Create: `src/app/services/http-cache.ts`, `src/app/services/http-cache.spec.ts`
- Modify: `src/app/services/openf1-service.ts` (righe ~105-257: proprietà di cache/coda e metodi `get`, `getList`, `ttlFor`, `load`, `fetchWithRetry`, `waitForRequestSlot`, `readCache`, `writeCache`, `evictOldest`)

**Interfaces:**
- Produces:
  ```ts
  export type ApiStatus = 'ok' | 'stale' | 'error';
  export interface HttpCacheOptions {
    prefix: string;                    // es. 'openf1:'
    minGapMs: number;
    maxPerWindow: number;
    windowMs: number;
    ttlFor: (url: string) => number;
    maxCachedChars?: number;           // default 400_000
    retryDelaysMs?: number[];          // default [2000, 8000, 20000]
  }
  export class HttpCache {
    constructor(http: HttpClient, options: HttpCacheOptions);
    readonly status: WritableSignal<ApiStatus>;
    get<T>(url: string): Promise<T>;      // 404 rilanciato senza toccare status
    getList<T>(url: string): Promise<T[]>; // 404 -> []
  }
  ```
- `Openf1ServiceService.apiStatus` diventa `readonly apiStatus = this.cache.status` (stesso tipo `WritableSignal<ApiStatus>`).

- [ ] **Step 1: Scrivi i test di `HttpCache`** in `http-cache.spec.ts`, costruendo `new HttpCache(TestBed.inject(HttpClient), {...})` con `provideHttpClient()` + `provideHttpClientTesting()` e prefisso `test:` (pulito dal `localStorage` in `beforeEach`):
  - `'serves a cached response within its TTL'` — `ttlFor: () => 60_000`; due `get` in sequenza → un solo `expectOne`.
  - `'refetches after the TTL expires'` — `ttlFor: () => 0` → due richieste.
  - `'returns stale data and sets status stale when the API fails'` — prima risposta ok, `ttlFor: () => 0`, seconda risposta `status: 500` → restituisce i dati vecchi, `status()` è `'stale'`.
  - `'getList returns [] on 404 and leaves status ok'`.
  - `'retries a 429 and resolves with the next response'` — `retryDelaysMs: [10]`, prima risposta 429, poi 200.
  - `'never starts more than maxPerWindow requests per window'` — con `vi.useFakeTimers()`, `minGapMs: 0`, `maxPerWindow: 2`, `windowMs: 1000`; tre `get` su URL diversi; dopo `await vi.advanceTimersByTimeAsync(0)` `httpMock.match(() => true).length === 2`; dopo `advanceTimersByTimeAsync(1000)` la terza è partita.
  - `'evicts the oldest entries when localStorage is full'` — `vi.spyOn(Storage.prototype, 'setItem')` che lancia `QuotaExceededError` solo alla prima chiamata per la nuova chiave; verifica che una voce più vecchia `test:` sia stata rimossa e la nuova salvata.

- [ ] **Step 2: Esegui** `npx ng test --watch=false` → i nuovi test falliscono (modulo `http-cache` inesistente).

- [ ] **Step 3: Implementa `HttpCache`** spostando il codice esistente di `Openf1ServiceService` (stessa logica, costanti sostituite dalle opzioni). La coda usa `windowMs`/`maxPerWindow` al posto dei 60 000 ms/28 fissi.

- [ ] **Step 4: Fai usare `HttpCache` a `Openf1ServiceService`**: `private readonly cache = new HttpCache(inject(HttpClient), { prefix: 'openf1:', minGapMs: 350, maxPerWindow: 28, windowMs: 60_000, ttlFor: url => /(session_key|meeting_key)=\d/.test(url) ? 86_400_000 : 1_800_000 })`; i metodi pubblici chiamano `this.cache.get/getList`; rimuovi le proprietà e i metodi spostati.

- [ ] **Step 5: Esegui** `npx ng test --watch=false` e `npm run build` → tutti verdi, compresi i 4 test di `openf1-service.spec.ts` non modificati.

- [ ] **Step 6: Commit** — `refactor: extract HttpCache from the OpenF1 service`

---

### Task 2: `JolpicaService`

**Files:**
- Create: `src/app/services/jolpica.service.ts`, `src/app/services/jolpica.service.spec.ts`

**Interfaces:**
- Consumes: `HttpCache`, `HttpCacheOptions`, `ApiStatus` (Task 1).
- Produces:
  ```ts
  export interface DriverStanding {
    position: number; points: number; wins: number;
    driverId: string; code?: string; fullName: string; nationality: string;
    constructorId: string; constructorName: string;   // ultima squadra della stagione
  }
  export interface ConstructorStanding {
    position: number; points: number; wins: number;
    constructorId: string; name: string; nationality: string;
  }
  @Injectable({ providedIn: 'root' }) export class JolpicaService {
    readonly apiStatus: WritableSignal<ApiStatus>;
    getSeasons(): Promise<number[]>;                        // decrescente
    getLatestSeasonWithStandings(): Promise<number>;
    getDriverStandings(season: number): Promise<DriverStanding[]>;
    getConstructorStandings(season: number): Promise<ConstructorStanding[]>;
  }
  ```

- [ ] **Step 1: Scrivi i test** (risposte finte con la forma reale di `MRData`):
  - `'normalizes driver standings'` — un pilota con `position: "1"`, `points: "340"`, `wins: "8"`, `givenName: "Andrea Kimi"`, `familyName: "Antonelli"`, `code: "ANT"` → `{ position: 1, points: 340, wins: 8, fullName: 'Andrea Kimi Antonelli', code: 'ANT', constructorId: 'mercedes' }`.
  - `'uses the last constructor of the season'` — `Constructors: [{constructorId:'rb'}, {constructorId:'red_bull'}]` → `constructorId === 'red_bull'`.
  - `'pages through standings longer than 100 rows'` — prima risposta `total: "120"` con 100 righe all'URL `.../1953/driverstandings/?limit=100&offset=0`; attesa seconda richiesta `offset=100`; risultato lungo 120.
  - `'returns no constructor standings before 1958'` — `getConstructorStandings(1955)` con `StandingsLists: []` → `[]`.
  - `'falls back to the previous year when the current season has no standings'` — `current/driverstandings/?limit=1` risponde `StandingsTable: { season: "2027", StandingsLists: [] }` → `2026`.
  - `'keeps finished seasons for a week and the current season for an hour'` — testa la funzione `ttlFor` esportata dal file (`jolpicaTtl(url, currentYear)`): `.../2019/driverstandings/` → `604_800_000`; `.../<anno corrente>/...` e `.../current/...` → `3_600_000`.

- [ ] **Step 2: Esegui i test** → falliscono.

- [ ] **Step 3: Implementa** `JolpicaService` con `new HttpCache(inject(HttpClient), { prefix: 'jolpica:', minGapMs: 260, maxPerWindow: 450, windowMs: 3_600_000, ttlFor: url => jolpicaTtl(url, new Date().getFullYear()) })`. URL: `seasons/?limit=100`, `current/driverstandings/?limit=1`, `<anno>/driverstandings/?limit=100&offset=<n>`, `<anno>/constructorstandings/?limit=100`. Paginazione: prima pagina, poi le restanti con `Promise.all`. Posizione: `Number(position)`, se non numerica usa l'indice + 1.

- [ ] **Step 4: Esegui i test e il build** → verdi.

- [ ] **Step 5: Commit** — `feat: Jolpica service for seasons and standings`

---

### Task 3: Pagina Classifiche

**Files:**
- Create: `src/app/components/standings/standings.component.ts|html|css|spec.ts`
- Modify: `src/app/utils/team-colors.ts`, `src/app/components/api-unavailable/api-unavailable.component.ts|html`, `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `JolpicaService`, `DriverStanding`, `ConstructorStanding` (Task 2); `Openf1ServiceService.getLatestDrivers()` (esistente); `currentSeasonPhotoUrl` (`utils/f1-media.ts`, esistente); `TEAM_COLORS` (esistente).
- Produces:
  - `export const CONSTRUCTOR_COLORS: Record<string, string>` in `team-colors.ts`, chiavi: `mercedes`, `ferrari`, `mclaren`, `red_bull`, `rb`, `alphatauri`, `toro_rosso`, `alpine`, `renault`, `aston_martin`, `racing_point`, `force_india`, `williams`, `haas`, `sauber`, `alfa`, `audi`, `cadillac` (esadecimale senza `#`, valori coerenti con `TEAM_COLORS` dove il team esiste).
  - `ApiUnavailableComponent`: `@Input() source: 'openf1' | 'jolpica' = 'openf1'`; con `'jolpica'` il paragrafo è il testo Jolpica dei Global Constraints; con `'openf1'` il testo attuale, invariato.
  - `StandingsComponent` (selector `app-standings`), rotta `{ path: 'classifiche', component: StandingsComponent }`. Membri pubblici usati dai test: `seasons: number[]`, `selectedSeason: number | null`, `tab: 'drivers' | 'constructors'`, `driverStandings: DriverStanding[]`, `constructorStandings: ConstructorStanding[]`, `loading: boolean`, `selectSeason(year: number): Promise<void>`, `setTab(tab): Promise<void>`, `driverLink(s: DriverStanding): string[] | null`, `initials(name: string): string`, `colorFor(constructorId: string): string`.

- [ ] **Step 1: Scrivi i test del componente**, con `JolpicaService` e `Openf1ServiceService` sostituiti da oggetti finti (`{ provide: JolpicaService, useValue: {...} }`) e `provideRouter([])`:
  - `'shows the latest season podium and table'` — 5 piloti finti per il 2026 → 3 elementi `.podium-item`, 2 righe in `tbody`.
  - `'links drivers only from 2023 and only with a code'` — `driverLink` di un pilota 2024 con `code: 'NOR'` → `['/drivers', 'NOR']`; pilota 1988 con `code` assente → `null`; pilota 2019 con `code` → `null`.
  - `'shows initials for historic drivers without a photo'` — stagione 1988, pilota senza `code`: nel podio c'è `.podium-initials` con testo `AS` per "Ayrton Senna" e nessun `img`.
  - `'says when a season has no standings yet'` — `getDriverStandings` restituisce `[]` → nel DOM c'è "Classifica non ancora disponibile per questa stagione."
  - `'explains that the constructors championship starts in 1958'` — stagione 1955, `setTab('constructors')` → il testo dei Global Constraints è nel DOM.
  - `'ignores a late response for a season no longer selected'` — `getDriverStandings` restituisce promesse controllate a mano: `selectSeason(2025)`, poi `selectSeason(2024)`; risolvi prima 2024 poi 2025 → `selectedSeason === 2024` e `driverStandings` sono quelli del 2024.
  - `'shows the Jolpica notice when the API is down'` — stub con `apiStatus` = `signal('error')` e classifiche che rifiutano → `app-api-unavailable` presente e testo contiene "Jolpica".

- [ ] **Step 2: Esegui i test** → falliscono.

- [ ] **Step 3: Implementa** colori, input `source`, rotta e componente secondo la spec (sezione "Pagina StandingsComponent"):
  - all'avvio `Promise.all([getSeasons(), getLatestSeasonWithStandings()])`, poi `selectSeason(latest)`; la griglia OpenF1 (`getLatestDrivers`, errori ignorati) serve solo quando `selectedSeason` è la stagione più recente con dati;
  - foto: abbina `code` a `name_acronym`, poi `currentSeasonPhotoUrl(driver)`; colore: `team_colour` OpenF1 se abbinato, altrimenti `colorFor(constructorId)`, con ripiego `'666666'`;
  - richieste fuori ordine: ogni `selectSeason` salva il proprio anno e ignora il risultato se nel frattempo `selectedSeason` è cambiato;
  - costruttori caricati al primo `setTab('constructors')` per quella stagione;
  - skeleton (classe globale `.skeleton`) a forma di podio e tabella mentre `loading`; area contenuti con `min-height: 520px`;
  - stile coerente con le pagine esistenti: `p-select` con `panelStyleClass="gp-dropdown-panel"` e CSS del pannello copiato da `gran-premi.component.css` (inclusa la regola flex applicata solo a `.p-select-option`); tab con lo stesso aspetto di `.tab-button` di `gran-premi-detail.component.css`; tabella con `table-layout: fixed`.

- [ ] **Step 4: Esegui test e build** → verdi.

- [ ] **Step 5: Commit** — `feat: Classifiche page with podium and standings tables`

---

### Task 4: Navigazione e verifica nel browser

**Files:**
- Modify: `src/app/app.component.html` (dopo il link `/drivers`), `src/app/components/footer/footer.component.html` (Link Rapidi dopo "Piloti"; Risorse dopo "OpenF1 API"), `src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: rotta `classifiche` (Task 3).

- [ ] **Step 1: Estendi il test** `'should render the main sections in the menu'` in `app.component.spec.ts` con `expect(nav).toContain('Classifiche')`.
- [ ] **Step 2: Esegui** → fallisce.
- [ ] **Step 3: Aggiungi** `<li><a routerLink="/classifiche">Classifiche</a></li>` nella barra e nel footer, e `<li><a href="https://github.com/jolpica/jolpica-f1" target="_blank">Jolpica F1 API</a></li>` nelle Risorse.
- [ ] **Step 4: Esegui test e build** → verdi.
- [ ] **Step 5: Verifica nel browser** con la build servita (`npx -y serve@14.2.4 -s dist/f1/browser -l 4321`) e uno script puppeteer-core + Edge (come le verifiche precedenti): cache vuota su `/classifiche` (podio 2026 con foto, ≤ 4 richieste a `api.jolpi.ca`); cambio stagione 1988 (iniziali, nessun link) e 1955 (messaggio 1958 nel tab Costruttori); risposte Jolpica rallentate di 4 s → skeleton visibile; richieste a `api.jolpi.ca` bloccate → avviso Jolpica con "Riprova"; nessun errore in console.
- [ ] **Step 6: Commit e push** — `feat: Classifiche in navigation and footer`
