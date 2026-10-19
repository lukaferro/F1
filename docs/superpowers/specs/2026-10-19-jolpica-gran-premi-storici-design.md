# Jolpica: Gran Premi storici (dal 1950)

Data: 2026-10-19
Progetto D1 dell'integrazione Jolpica + news. Il progetto D (storico pre-2023) si completa con D1 (Gran Premi), dopo aver completato A (Classifiche), B (carriera nel dettaglio pilota) e D2 (piloti storici).

## Obiettivo

OpenF1 copre solo dal 2023. Rendere consultabili tutti i Gran Premi della F1 dal 1950: calendario per stagione storica, filtri per paese e circuito, card con vincitore della gara, e pagina di dettaglio storico per ogni Gran Premio con podio (e foto dei primi 3), classifica ufficiale completa e qualifiche (ove disponibili).

Criteri di riuscita:

- Nella pagina Gran Premi (`/granpremi`) il selettore Anno include tutte le stagioni dal 1950 all'anno corrente (unione Jolpica + OpenF1);
- Per gli anni prima del 2023, la pagina mostra le card dei Gran Premi di quella stagione con paese, bandiera, circuito, data, round, e vincitore della gara con scuderia e colore del team;
- I filtri Paese e Circuito si adattano alle gare della stagione storica selezionata e permettono di filtrare le card;
- Ciascun Gran Premio precedente al 2023 si apre nella rotta `/granpremi/storico/:season/:round`;
- La pagina di dettaglio storico mostra la testata del Gran Premio, il podio con i primi 3 classificati (foto Wikipedia o iniziali sul colore del team), la tabella completa dei risultati con posizioni, piloti, scuderie, tempi/ritiri e punti, e il tab/sezione qualifiche se disponibili per quell'anno;
- I nomi dei piloti nel dettaglio Gran Premio sono link cliccabili verso il rispettivo dettaglio (`/drivers/storico/:driverId` o `/drivers/:code` se >= 2023);
- Nessuna regressione sulle gare dal 2023 in poi gestite con OpenF1 (`/granpremi` e `/granpremi/:id`);
- Se l'archivio Jolpica non risponde compare `app-api-unavailable source="jolpica"` con pulsante "Riprova".

## Fuori ambito

- Sessioni minute (stints gomme, telemetria meteo, pit stop e radio) per gare storiche: non esistono nelle banche dati pre-2023.
- Unificare le rotte di dettaglio in una sola (stessa scelta fatta per i piloti: `/granpremi/storico/:season/:round` resta distinta da `/granpremi/:id` numerico).

## Vincoli dell'API Jolpica

- Base URL: `https://api.jolpi.ca/ergast/f1/`. Coda a 550 ms e cache tramite `HttpCache`.
- Elenco gare con vincitore in 1 sola richiesta: `/{season}/results/1/?limit=100` restituisce tutte le gare della stagione con `Results[0]` contenente il vincitore.
- Dettaglio gara: `/{season}/{round}/results/?limit=100` restituisce la classifica completa della gara.
- Qualifiche: `/{season}/{round}/qualifying/?limit=100` (presente per stagioni moderne o ove censito, lista vuota se assente).
- Paese del circuito in Jolpica è in inglese ("Italy", "UK", "USA", "Brazil", ecc.): va convertito nel codice paese appropriato per la bandiera `flagUrl`.

## Architettura

### 1. `src/app/utils/country-flags.ts` e mapping paesi circuito
Aggiungere supporto alla conversione da nome paese circuito ("Italy", "UK", "USA", "Monaco", "Morocco", ecc.) a codice a 3 lettere (`ITA`, `GBR`, `USA`, `MON`, `MAR`, ecc.), estendendo `COUNTRY_CODES` con `MAR: 'ma'` e la funzione `countryNameToCode(country: string): string`.

### 2. `JolpicaService` (esteso)
Nuovi metodi pubblici per le gare:
- `getSeasonRaces(season: number): Promise<HistoricRaceSummary[]>`:
  Chiama `/${season}/results/1/?limit=100`. Converte la risposta in una lista tipizzata `HistoricRaceSummary`:
  `{ season, round, raceName, circuitId, circuitName, locality, country, date, time?, url?, winner?: { driverId, code?, fullName, constructorId, constructorName, time? } }`.
- `getRaceResults(season: number, round: number): Promise<HistoricRaceDetail | null>`:
  Chiama `/${season}/${round}/results/?limit=100`. Converte la risposta in `HistoricRaceDetail` con array `results: HistoricRaceResult[]`.
- `getRaceQualifying(season: number, round: number): Promise<HistoricQualifyingResult[]>`:
  Chiama `/${season}/${round}/qualifying/?limit=100`. Se vuoto o errore 404, restituisce array vuoto.

### 3. `HistoricGranPremiDetailComponent` (nuovo, `src/app/components/historic-gran-premi-detail/`)
Rotta: `{ path: 'granpremi/storico/:season/:round', component: HistoricGranPremiDetailComponent }` registrata in `app.routes.ts` prima di `granpremi/:id`.
Struttura della pagina:
- **Hero / Header**:
  - Bandiera paese (`flagUrl`), round, nome Gran Premio, nome circuito, località, data.
  - Link Wikipedia della gara se presente.
  - Pulsante "Torna ai Gran Premi".
- **Podio (Top 3)**:
  - 1°, 2°, 3° posto con badge, foto caricata tramite `WikipediaService.getImages` (o iniziali sul colore costruttore), nome pilota (con link), scuderia con colore/logo, tempo o distacco, punti.
- **Tabella Risultati Gara**:
  - Posizione, N° auto, Pilota (link a dettaglio pilota), Scuderia (con colore del costruttore), Giri completati, Griglia di partenza (con guadagno/perdita posizioni), Tempo / Distacco / Motivo ritiro (`status`), Punti.
- **Tabella Qualifiche**:
  - Mostrata tramite tab o sezione condizionale solo se `qualifyingResults.length > 0`.
- **Stato Errore / Loading**:
  - Skeleton per podio e tabella durante il caricamento;
  - `app-api-unavailable source="jolpica"` con metodo retry;
  - Gara non trovata se l'API restituisce lista vuota.

### 4. `GranPremiComponent` (esteso)
- Nel selettore anni: `years` popolato con l'unione tra anni OpenF1 e `jolpicaService.getSeasons()`.
- Gestione `onYearChange`:
  - Se `selectedYear < 2023`:
    - Chiama `jolpicaService.getSeasonRaces(year)`.
    - Popola `countries` e `circuits` dai dati delle gare di quell'anno.
    - Applica i filtri su `selectedCountry` e `selectedCircuit`.
    - Mostra le card storiche con vincitore e link a `['/granpremi', 'storico', race.season, race.round]`.
  - Se `selectedYear >= 2023` o nullo:
    - Mantiene il comportamento esistente con OpenF1.
  - Numero di sequenza per cancellare/ignorare richieste obsolete in caso di cambi rapidi d'anno.

## Flusso dei dati e Caching
- Anno storico in `/granpremi`: 1 richiesta a Jolpica (`results/1/?limit=100`), TTL 7 giorni per stagioni passate in `HttpCache`.
- Dettaglio Gran Premio storico: 1 richiesta per la gara (`results/?limit=100`) + 1 richiesta per le qualifiche + 1 richiesta a Wikipedia per le foto del podio (3 titoli).
- Clic ripetuti o navigazione a ritroso riusano la cache in memoria e localStorage senza chiamate HTTP aggiuntive.

## Test
- `country-flags.spec.ts`: test su `countryNameToCode` e nuovi codici (Morocco, ecc.).
- `jolpica.service.spec.ts`: test su `getSeasonRaces`, `getRaceResults`, `getRaceQualifying`.
- `historic-gran-premi-detail.component.spec.ts`: rendering podio, tabella risultati, link piloti, qualifiche presenti/assenti, 404, fallback avviso Jolpica.
- `gran-premi.component.spec.ts`: anni dal 1950, selezione anno storico mostra card storiche con vincitore, filtri paese/circuito su anno storico, cambi rapidi d'anno ignorati.
- Verifica browser: navigazione 1988 (Monza, Monaco), podio con foto, classifica completa, navigazione 1950 (Silverstone), filtri, responsive mobile.
