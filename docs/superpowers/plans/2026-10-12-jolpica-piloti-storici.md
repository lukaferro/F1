# Jolpica: piloti storici — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendere consultabili tutti gli 881 piloti dal 1950 (elenco per stagione, ricerca, dettaglio storico) e caricare la biografia Wikipedia con al massimo 2 richieste.

**Architecture:** `JolpicaService` espone anagrafica, elenco completo e titolo Wikipedia dei piloti; un nuovo `WikipediaService` raccoglie biografia e foto (oggi dentro `DriverDetailComponent`) e le serve a un `WikipediaBioComponent` condiviso. Un nuovo `HistoricDriverDetailComponent` (`/drivers/storico/:driverId`) unisce anagrafica, biografia e la sezione carriera del progetto B; la pagina Piloti aggiunge le stagioni dal 1950 con card costruite dalle classifiche Jolpica.

**Tech Stack:** Angular 21 (standalone, `@if/@for`, `@Input/@Output`), PrimeNG 21, Vitest + jsdom, `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-12-jolpica-piloti-storici-design.md`

## Global Constraints

- Rotta storica: `drivers/storico/:driverId`; i piloti dal 2023 restano su `drivers/:id` (sigla o numero).
- Link a un pilota: stagione ≥ 2023 con `code` → `['/drivers', code]`; altrimenti `['/drivers', 'storico', driverId]`.
- Wikipedia: `https://en.wikipedia.org/w/api.php` e `https://it.wikipedia.org/w/api.php` con `format=json&origin=*`; foto in blocchi di massimo 50 titoli, `pithumbsize=400`.
- Biografia con titolo noto: massimo 2 richieste (en con `prop=extracts|pageimages|langlinks&lllang=it&exintro=1&explaintext=1&redirects=1`, poi it con `prop=extracts&exintro=1&explaintext=1&redirects=1` solo se esiste la versione italiana).
- Ricerca senza anno: massimo 48 risultati; oltre, nota "Affina la ricerca per vedere altri piloti".
- Testi esatti: "Pilota non trovato", "Torna ai Piloti", "Dati biografici non ancora disponibili. Questo pilota potrebbe essere nuovo in F1 o i dati non sono ancora su Wikipedia."
- Jolpica: coda a 550 ms (già impostata), limite osservato ~18 richieste/10 s; nessuna richiesta ripetuta senza cache.
- 16 piloti Jolpica non hanno `url` e alcuni non hanno `nationality`: tutti i campi derivati sono opzionali.
- Commenti in italiano. **Nessuna attribuzione a Claude nei commit.**
- Comandi: test `npx ng test --watch=false` (se stampa "Vitest failed to find the runner", rilanciare: succede con il dev server acceso), build `npm run build`.

## Review Focus

- Pilota senza `url` Wikipedia o senza `nationality` (es. alcuni anni '50): il dettaglio storico mostra iniziali, nessuna bandiera e la biografia cercata per nome, senza errori → test in Task 4.
- Cambio rapido di anno nella pagina Piloti (1975 poi subito 2024): le card del 1975 non devono comparire sopra quelle del 2024 → test in Task 5.
- Ricerca senza anno con testo breve (es. "a"): centinaia di corrispondenze, si mostrano 48 risultati e la nota, senza 881 foto richieste → test in Task 5.
- `driverId` di tre lettere (es. `ide`) aperto come storico: la rotta storica non lo confonde con una sigla → test in Task 4 (navigazione a `storico/ide`).
- Titolo Wikipedia con redirect (es. pagina rinominata): la foto e la biografia seguono il redirect invece di sparire → test in Task 2.

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/app/services/jolpica.service.ts` (+spec) | `getDriver`, `getAllDrivers`, `wikiTitle` in classifiche e `findDriver`, `wikiTitleFromUrl` |
| `src/app/utils/nationality.ts` (+spec) | nazionalità storiche |
| `src/app/utils/country-flags.ts` (+spec, nuovo) | codice paese → URL bandiera (spostato da `driver-detail`) |
| `src/app/services/wikipedia.service.ts` (+spec, nuovo) | biografia e foto da Wikipedia |
| `src/app/components/wikipedia-bio/*` (nuovo) | pannello "Profilo" condiviso |
| `src/app/components/driver-career/*` | input `driverId`, output `matched` |
| `src/app/components/driver-detail/*` | usa `WikipediaBioComponent` e `country-flags` |
| `src/app/components/historic-driver-detail/*` (nuovo) | dettaglio storico |
| `src/app/app.routes.ts`, `src/app/components/standings/*` | rotta e link storici |
| `src/app/components/drivers/*` | anni dal 1950, card storiche, ricerca su tutti |

---

### Task 1: dati Jolpica dei piloti, nazionalità e bandiere

**Files:**
- Modify: `src/app/services/jolpica.service.ts`, `src/app/utils/nationality.ts`, `src/app/components/driver-detail/driver-detail.component.ts`
- Create: `src/app/utils/country-flags.ts`
- Test: `jolpica.service.spec.ts`, `nationality.spec.ts`, `country-flags.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface JolpicaDriverInfo {
    driverId: string; code?: string; permanentNumber?: number;
    givenName: string; familyName: string; fullName: string;
    dateOfBirth?: string; nationality?: string; wikiTitle?: string;
  }
  export function wikiTitleFromUrl(url: string | undefined): string | undefined; // "http://en.wikipedia.org/wiki/Ayrton_Senna" → "Ayrton_Senna" (decodificato), undefined senza "/wiki/"
  DriverStanding.wikiTitle?: string;
  JolpicaDriverMatch.wikiTitle?: string;
  JolpicaService.getDriver(driverId: string): Promise<JolpicaDriverInfo | null>;  // `${BASE_URL}/drivers/${driverId}/` ; null con lista vuota o 404
  JolpicaService.getAllDrivers(): Promise<JolpicaDriverInfo[]>;                    // getAllPages su `${BASE_URL}/drivers/?limit=100&offset=${o}`
  // country-flags.ts
  export function flagUrl(countryCode: string | undefined): string;  // '' senza codice; `https://flagcdn.com/w320/${iso2}.png`
  ```

- [ ] **Step 1: Scrivi i test.**
  - `wikiTitleFromUrl`: `'http://en.wikipedia.org/wiki/Ayrton_Senna'` → `'Ayrton_Senna'`; `'https://en.wikipedia.org/wiki/Nico_H%C3%BClkenberg'` → `'Nico_Hülkenberg'`; `undefined` → `undefined`; `'http://example.com'` → `undefined`.
  - `'reads a driver'`: risposta con `permanentNumber: '44'`, `dateOfBirth: '1985-01-07'`, `url` → `{ driverId: 'hamilton', permanentNumber: 44, fullName: 'Lewis Hamilton', wikiTitle: 'Lewis_Hamilton', … }`.
  - `'returns null for an unknown driver'`: `Drivers: []` → `null`; e risposta 404 → `null`.
  - `'lists every driver across pages'`: `total: '120'`, due pagine → 120 voci.
  - `'adds the wikipedia title to standings and lookups'`: riga di classifica con `Driver.url` → `wikiTitle`; `findDriver` → `wikiTitle`.
  - `nationality`: `'Rhodesian'` → `'RHO'`, `'East German'` → `'GDR'`, `'Uruguayan'` → `'URU'`, `'South African'` → `'RSA'`, `'Liechtensteiner'` → `'LIE'`.
  - `country-flags`: `flagUrl('GBR')` → `'https://flagcdn.com/w320/gb.png'`; `flagUrl('RHO')` → `…/zw.png`; `flagUrl('GDR')` → `…/de.png`; `flagUrl(undefined)` → `''`; codice sconosciuto `'XYZ'` → `…/xyz.png` (comportamento attuale).

- [ ] **Step 2: Esegui** i test → falliscono (funzioni assenti).

- [ ] **Step 3: Implementa.**
  - In `jolpica.service.ts` i metodi e i campi sopra; `JolpicaDriver` interno riceve `url?`, `permanentNumber?`, `dateOfBirth?`; una funzione privata converte `JolpicaDriver` → `JolpicaDriverInfo`.
  - `nationality.ts`: aggiungi South African `RSA`, Irish `IRL`, Portuguese `POR`, Uruguayan `URU`, Rhodesian `RHO`, East German `GDR`, Hungarian `HUN`, Czech `CZE`, Indonesian `INA`, Chilean `CHI`, Malaysian `MAS`, Liechtensteiner `LIE`.
  - `country-flags.ts`: sposta qui `countryCodeMapping` da `driver-detail.component.ts` e aggiungi `RSA: 'za'`, `IRL: 'ie'`, `URU: 'uy'`, `RHO: 'zw'`, `GDR: 'de'`, `INA: 'id'`, `CHI: 'cl'`, `MAS: 'my'`, `LIE: 'li'`. `DriverDetailComponent.getFlagUrl` usa `flagUrl(driver?.country_code)`.

- [ ] **Step 4: Esegui** test e build → verdi.

- [ ] **Step 5: Commit** — `feat: Jolpica driver records, historic nationalities and shared flags`

---

### Task 2: `WikipediaService`

**Files:**
- Create: `src/app/services/wikipedia.service.ts`, `src/app/services/wikipedia.service.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface WikipediaBio { extract: string; url: string; image?: string; }
  @Injectable({ providedIn: 'root' })
  export class WikipediaService {
    getBio(options: { title?: string; name: string }): Promise<WikipediaBio | null>;
    getImages(titles: string[]): Promise<Map<string, string>>;  // chiave: titolo richiesto
  }
  ```
- `getBio` senza `title`: stessa logica di `DriverDetailComponent.loadWikipediaInfo` (locales `['it', 'en']`, varianti da `wikiNameVariants` spostata qui, `list=search` poi `prop=extracts`); `image` assente.
- `getBio` con `title`: prima richiesta en (vedi Global Constraints); `image` = `thumbnail.source` della pagina en; se `langlinks[0]['*']` esiste, seconda richiesta it per quell'estratto e `url` it; se l'estratto it è vuoto o la richiesta fallisce, estratto e `url` en. `null` se la pagina en non esiste (`missing`) o è vuota.
- `getImages`: blocchi di 50, mappa ogni titolo richiesto anche attraverso `query.normalized` e `query.redirects`.
- Errori di rete: `getBio` → `null`, `getImages` → mappa con quello che è arrivato.
- Cache in memoria per chiave (`bio:<title|name>`, `img:<title>`).

- [ ] **Step 1: Scrivi i test** (con `HttpTestingController`, URL confrontati con `req.url` e `req.params` o con match per funzione):
  - `'reads the italian bio with two requests when the page has an italian version'` → `extract` it, `url` `https://it.wikipedia.org/wiki/<titolo it>`, `image` dalla pagina en; esattamente 2 richieste.
  - `'falls back to the english extract without an italian version'` → 1 richiesta, `url` en.
  - `'returns null for a missing page'`.
  - `'searches by name without a title'` → richiesta `list=search` su it.
  - `'loads images fifty titles at a time'` → 60 titoli → 2 richieste (50 e 10).
  - `'follows redirects and normalized titles for images'` → titolo richiesto `Nico_Hulkenberg` con `redirects: [{ from: 'Nico Hulkenberg', to: 'Nico Hülkenberg' }]` e `normalized: [{ from: 'Nico_Hulkenberg', to: 'Nico Hulkenberg' }]` → la mappa ha la chiave `Nico_Hulkenberg`.
  - `'serves a cached bio without new requests'`.

- [ ] **Step 2: Esegui** → falliscono.
- [ ] **Step 3: Implementa** `wikipedia.service.ts` con `HttpClient` e `firstValueFrom`.
- [ ] **Step 4: Esegui** → verdi.
- [ ] **Step 5: Commit** — `feat: Wikipedia service for driver bios and photos`

---

### Task 3: biografia condivisa e sezione carriera estesa

**Files:**
- Create: `src/app/components/wikipedia-bio/wikipedia-bio.component.{ts,html,css,spec.ts}`
- Modify: `src/app/components/driver-career/driver-career.component.{ts,spec.ts}`, `src/app/components/driver-detail/driver-detail.component.{ts,html,css,spec.ts}`

**Interfaces:**
- Consumes: `WikipediaService.getBio` (Task 2), `JolpicaDriverMatch.wikiTitle` (Task 1).
- Produces:
  ```ts
  // selector 'app-wikipedia-bio'
  @Input() title?: string; @Input({ required: true }) name!: string; @Input() waiting = false;
  // DriverCareerComponent
  @Input() driverId?: string;   // presente → niente findDriver
  @Output() matched = new EventEmitter<{ nationality?: string; wikiTitle?: string } | null>();  // sostituisce `nationality`
  ```

- [ ] **Step 1: Scrivi i test.**
  - `WikipediaBioComponent` (servizio finto): `'shows the bio text and link'`; `'shows the skeleton while waiting and makes no request'` (`waiting: true` → `getBio` non chiamato); `'shows the missing-bio message'` (`null` → testo esatto da Global Constraints); `'ignores a bio that arrives after the inputs changed'`; `'projects the intro above the bio'` (contenuto `<p class="intro">` presente).
  - `DriverCareerComponent`: `'skips the lookup when a driverId is given'` (`findDriver` non chiamato, `getCareerTotals('senna')`); `'emits the wikipedia title when matched'` (`matched` → `{ nationality: 'British', wikiTitle: 'Lewis_Hamilton' }`); i test esistenti su `nationality` diventano su `matched` (`null` quando non trovato o Jolpica non risponde).
  - `DriverDetailComponent`: `'waits for the career match before loading the bio'` (prima di `matched` `app-wikipedia-bio` ha `waiting` true; dopo `onMatched({ wikiTitle: 'Lewis_Hamilton' })` riceve quel `title` e `waiting` false); il test sulla bandiera usa `onMatched({ nationality: 'British' })` e `onMatched(null)`.

- [ ] **Step 2: Esegui** → falliscono.
- [ ] **Step 3: Implementa.**
  - `WikipediaBioComponent`: stesso markup e stili del pannello attuale (skeleton a 5 righe, `.wiki-content`, `.wiki-link`, messaggio `.muted`), `<ng-content>` prima del testo; `ngOnChanges` → carica se `!waiting`; numero di sequenza per le risposte superate.
  - `DriverCareerComponent`: con `driverId` salta `findDriver` (la nazionalità e il titolo non servono: nessun `matched` emesso); `matched` emette `{ nationality, wikiTitle }` o `null` dove oggi emette `nationality`.
  - `DriverDetailComponent`: sezione "Profilo" = `<section class="panel bio-panel"><h2>Profilo</h2><app-wikipedia-bio [title]="wikiTitle" [name]="driver.full_name" [waiting]="nationalityPending">` con dentro le frasi introduttive esistenti; `onNationality` diventa `onMatched(match)` e imposta `wikiTitle`; rimuovi `loadWikipediaInfo`, `wikiExtract`, `wikiUrl`, `loadingWiki`, `wikiNameVariants`, `HttpClient`, `countryCodeMapping` (ora in `country-flags.ts`) e le regole CSS spostate.

- [ ] **Step 4: Esegui** test e build → verdi.
- [ ] **Step 5: Commit** — `feat: shared Wikipedia bio panel loaded from the exact page title`

---

### Task 4: dettaglio pilota storico e link da Classifiche

**Files:**
- Create: `src/app/components/historic-driver-detail/historic-driver-detail.component.{ts,html,css,spec.ts}`
- Modify: `src/app/app.routes.ts`, `src/app/components/standings/standings.component.{ts,spec.ts}`

**Interfaces:**
- Consumes: `getDriver`, `getDriverSeasons`, `getDriverStandings` (Task 1 e progetto B), `WikipediaService.getImages` (Task 2), `WikipediaBioComponent`, `DriverCareerComponent` con `driverId` (Task 3), `flagUrl`, `nationalityToCountryCode`, `constructorColor`.
- Produces: rotta `{ path: 'drivers/storico/:driverId', component: HistoricDriverDetailComponent }` **prima** di `drivers/:id`; `StandingsComponent.driverLink(standing)` → `['/drivers', code]` dal 2023 con `code`, altrimenti `['/drivers', 'storico', standing.driverId]`.

- [ ] **Step 1: Scrivi i test** (Jolpica e Wikipedia finti, `ActivatedRoute` con `paramMap` di `driverId`):
  - `'shows the historic driver'`: Senna (`nationality: 'Brazilian'`, `dateOfBirth: '1960-03-21'`, `permanentNumber` assente) → nome "Ayrton Senna", bandiera `…/br.png`, "21 marzo 1960", nessun badge numero, "Stagioni 1984–1994", "Ultima scuderia Williams", `app-driver-career` con `driverId` `'senna'`, `app-wikipedia-bio` con `title` `'Ayrton_Senna'`.
  - `'shows initials when there is no photo'`: `getImages` → mappa vuota → elemento `.portrait-initials` con "AS" sul colore `#` + `constructorColor('williams')`.
  - `'handles a driver without wikipedia page and nationality'`: `wikiTitle` e `nationality` assenti → nessuna bandiera, `app-wikipedia-bio` senza `title` e con `name`.
  - `'shows not found for an unknown driver'`: `getDriver` → `null` → "Pilota non trovato" e link "Torna ai Piloti".
  - `'shows the Jolpica notice when the archive does not answer'`: `getDriver` rifiutata → `app-api-unavailable`; `retry` ricarica.
  - `'routes three-letter driver ids to the historic page'`: con le rotte reali (`provideRouter(routes)` e `RouterTestingHarness`), `/drivers/storico/ide` crea `HistoricDriverDetailComponent`.
  - Classifiche: `'links historic drivers to their historic page'` → stagione 1988, `driver(1, 'Ayrton Senna', { driverId: 'senna' })` → `['/drivers', 'storico', 'senna']`; il test esistente su 2019 diventa `['/drivers', 'storico', 'hamilton']`.

- [ ] **Step 2: Esegui** → falliscono.
- [ ] **Step 3: Implementa** il componente (stessa struttura visiva di `driver-detail`: `.hero`, `.content-grid`, pannelli `.panel`; stili copiati solo per le classi usate). Data di nascita con `toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })`. Stagioni e ultima scuderia: `getDriverSeasons` poi `getDriverStandings(ultima)`. La rotta e `driverLink`.
- [ ] **Step 4: Esegui** test e build → verdi.
- [ ] **Step 5: Commit** — `feat: historic driver page from Jolpica and Wikipedia`

---

### Task 5: pagina Piloti dal 1950 e verifica nel browser

**Files:**
- Modify: `src/app/components/drivers/drivers.component.{ts,html,css,spec.ts}`

**Interfaces:**
- Consumes: `getSeasons`, `getDriverStandings`, `getAllDrivers` (Task 1), `getImages` (Task 2), `constructorColor`, `flagUrl`, `nationalityToCountryCode`.
- Produces:
  ```ts
  export interface HistoricCard {
    driverId: string; name: string; team?: string; color: string;  // color senza '#'
    badge?: string;         // 'P3' nelle stagioni, assente nella ricerca
    flag?: string;          // solo nella ricerca senza anno
    photo?: string; initials: string; link: string[];
  }
  DriversComponent.historicCards: HistoricCard[] | null;  // null = vista OpenF1 attuale
  DriversComponent.searchLimited: boolean;                // true se la ricerca ha più di 48 risultati
  ```

- [ ] **Step 1: Scrivi i test** (Jolpica, Wikipedia e OpenF1 finti; servizio OpenF1 con 2023–2026):
  - `'offers every season since 1950'`: `years` contiene 2026 e 1950.
  - `'shows the latest season in team colours when no year is chosen'`: senza anno → solo i piloti dell'anno più recente, `getTeamColor` diverso da `'555555'`.
  - `'shows a historic season with teams, colours and positions'`: anno 1988 → `historicCards` con `{ name: 'Ayrton Senna', team: 'McLaren', color: constructorColor('mclaren'), badge: 'P1', link: ['/drivers', 'storico', 'senna'] }`.
  - `'uses initials when a historic driver has no photo'`.
  - `'ignores a season that arrives after another was chosen'`: 1975 lento, poi 2024 → `historicCards` `null` e piloti 2024.
  - `'searches every driver when no year is chosen'`: testo "schum" → Michael, Ralf, Mick; Mick (presente nella griglia OpenF1 con sigla `MSC`) ha link `['/drivers', 'MSC']`, gli altri il link storico.
  - `'limits a broad search to 48 results'`: 100 piloti che contengono "a" → 48 card, `searchLimited` true e testo "Affina la ricerca per vedere altri piloti"; `getImages` chiamato con 48 titoli.
  - `'shows the Jolpica notice when a historic season fails'`.
- [ ] **Step 2: Esegui** → falliscono.
- [ ] **Step 3: Implementa.**
  - Anni: unione degli anni OpenF1 e di `getSeasons()`; se Jolpica non risponde restano gli anni OpenF1.
  - Senza anno e senza ricerca: piloti dell'anno più recente con i loro colori (oggi tutti i piloti dal 2023 in grigio).
  - Anno < 2023: `historicCards` dalla classifica, foto con `getImages` sui `wikiTitle`; numero di sequenza per i cambi rapidi.
  - Ricerca senza anno: `getAllDrivers()` alla prima ricerca, confronto senza accenti su nome completo, ordinamento alfabetico per cognome, primi 48, colore neutro `'555555'`, bandiera da `nationalityToCountryCode` + `flagUrl`.
  - Template: blocco `@if (historicCards)` con card dello stesso stile (`.driver-card`, `.driver-header` col colore, `.driver-accent`) e, al posto del numero, il `badge`; foto con `object-fit: cover; object-position: top`; iniziali in un riquadro col colore.
- [ ] **Step 4: Esegui** test e build → verdi.
- [ ] **Step 5: Verifica nel browser** (dev server, Edge + puppeteer-core in scratchpad): Piloti senza anno (griglia attuale colorata); anno 1988 (Senna P1 McLaren, foto); anno 1955 (molti piloti, iniziali dove mancano foto); ricerca "schumacher"; ricerca "a" (48 e nota); clic su Senna → `/drivers/storico/senna` con biografia in italiano, carriera e grafico; Fangio; un pilota senza foto; Hamilton (biografia con 2 richieste Wikipedia, controllando la rete); Classifiche 1988 → clic su un pilota; Jolpica bloccata; larghezza 375 px senza scroll orizzontale. Errori in console: nessuno nuovo.
- [ ] **Step 6: Commit** — `feat: drivers page from 1950 with historic seasons and search`
