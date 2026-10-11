# Jolpica: service di base e pagina Classifiche

Data: 2026-10-11
Progetto A di 5 dell'integrazione Jolpica + news (B: statistiche carriera, C: circuiti, D: storico pre-2023, E: news).

## Obiettivo

Aggiungere all'app una pagina **Classifiche** con la classifica piloti e costruttori di qualsiasi stagione dal 1950 a oggi, usando l'API Jolpica (archivio storico F1, erede di Ergast). Il lavoro costruisce anche la base riutilizzata dai progetti B, C e D: un `JolpicaService` e una cache HTTP comune con `Openf1ServiceService`.

Criteri di riuscita:

- dalla barra di navigazione si apre `/classifiche` e si vede subito la classifica dell'ultima stagione con dati;
- si può scegliere qualsiasi stagione dal 1950 e passare tra Piloti e Costruttori;
- la stagione in corso mostra foto ufficiali e colori dei team; le stagioni passate restano leggibili anche senza foto;
- una stagione già vista si riapre senza nuove richieste;
- se Jolpica non risponde compare l'avviso con "Riprova", non una pagina vuota o una rotella infinita;
- `Openf1ServiceService` mantiene esattamente il comportamento attuale (i test esistenti restano verdi).

## Fuori ambito

- statistiche di carriera nel dettaglio pilota (progetto B);
- pagine di dettaglio per piloti o Gran Premi precedenti al 2023 (progetto D);
- funzioni server o proxy: le richieste partono dal browser (decisione presa: approccio 1).

## Vincoli dell'API Jolpica

- Base URL: `https://api.jolpi.ca/ergast/f1/`; i percorsi finiscono con `/`; risposte JSON sotto `MRData`.
- Limiti per indirizzo IP, senza autenticazione: **4 richieste al secondo**, **500 all'ora**; oltre risponde 429.
- `limit` massimo 100 per pagina (default 30), paginazione con `offset`; `MRData.total` indica il totale.
- CORS aperto (`access-control-allow-origin: *`).
- Le stagioni sono 77 (1950–2026). La classifica costruttori esiste dal **1958**: per gli anni precedenti la risposta ha `StandingsLists` vuoto.
- I piloti delle stagioni storiche non hanno `code` (la sigla a tre lettere); alcune stagioni degli anni '50 superano le 100 righe in classifica.
- Il campo `Constructors` di ogni pilota è una lista (un pilota può aver cambiato squadra in stagione): si mostra l'ultima.

## Architettura

### `HttpCache` (nuovo, `src/app/services/http-cache.ts`)

Classe semplice (non un service iniettabile): riceve `HttpClient` nel costruttore, espone lo stato come `signal` Angular ed è istanziata da ciascun service con la propria configurazione. Contiene la logica che oggi sta dentro `Openf1ServiceService`, spostata senza cambiarne il comportamento:

- cache in memoria e in `localStorage` con prefisso configurabile (`openf1:`, `jolpica:`), TTL calcolato da una funzione passata dal service, limite di dimensione per voce e rimozione delle voci più vecchie quando lo spazio finisce;
- richieste identiche in corso condivise (una sola chiamata HTTP);
- coda delle richieste con pausa minima tra una partenza e l'altra e numero massimo di richieste per finestra di tempo;
- nuovi tentativi sui 429 (e sugli errori senza risposta, finché l'API non risulta irraggiungibile);
- ripiego sui dati in cache, anche scaduti, quando l'API non risponde;
- segnale `status` (`ok` / `stale` / `error`) come l'attuale `apiStatus`.

Configurazione:

| | OpenF1 (invariata) | Jolpica |
|---|---|---|
| prefisso cache | `openf1:` | `jolpica:` |
| pausa minima | 350 ms | 260 ms (≈ 4/s) |
| finestra | 28 richieste / 60 s | 450 richieste / 3600 s |
| TTL | 24 h con `session_key`/`meeting_key`, altrimenti 30 min | 7 giorni per stagioni concluse, 1 h per la stagione in corso e per l'elenco stagioni |

`Openf1ServiceService` continua a esporre `apiStatus` (ora collegato al segnale di `HttpCache`) e gli stessi metodi pubblici.

### `JolpicaService` (nuovo, `src/app/services/jolpica.service.ts`)

Metodi pubblici:

- `getSeasons(): Promise<number[]>` — elenco stagioni in ordine decrescente (`/seasons/?limit=100`);
- `getLatestSeasonWithStandings(): Promise<number>` — prova `current/driverstandings/`; se la lista è vuota (inizio stagione, nessuna gara corsa) restituisce l'anno precedente;
- `getDriverStandings(season): Promise<DriverStanding[]>` — gestisce la paginazione oltre 100 righe;
- `getConstructorStandings(season): Promise<ConstructorStanding[]>` — lista vuota per le stagioni prima del 1958;
- `apiStatus` — segnale di stato della sua `HttpCache`.

I tipi (`DriverStanding`, `ConstructorStanding`) sono normalizzati dal service: numeri come `number`, campi già pronti per la pagina (nome completo, sigla se presente, nazionalità, `constructorId` e nome dell'ultima squadra, punti, vittorie, posizione).

### Colori dei team per costruttore (`src/app/utils/team-colors.ts`)

Si aggiunge `CONSTRUCTOR_COLORS`, indicizzato per `constructorId` Jolpica: `mercedes`, `ferrari`, `mclaren`, `red_bull`, `rb`, `alphatauri`, `toro_rosso`, `alpine`, `renault`, `aston_martin`, `racing_point`, `force_india`, `williams`, `haas`, `sauber`, `alfa`, `audi`, `cadillac`. Costruttori non presenti: grigio neutro. Per la stagione in corso il colore preferito resta `team_colour` di OpenF1, se il pilota è abbinato.

### Pagina `StandingsComponent` (`/classifiche`)

- **Selettore stagione** (`p-select`, stesso stile dei filtri esistenti) con tutte le stagioni; all'apertura è selezionata l'ultima stagione con dati.
- **Tab Piloti / Costruttori**, stesso stile dei tab delle sessioni.
- **Podio** con i primi tre: posizione, nome, squadra, punti, vittorie. Nella stagione in corso c'è la foto ufficiale 2026 (`currentSeasonPhotoUrl`), ottenuta abbinando la sigla Jolpica alla `name_acronym` della griglia OpenF1 (`getLatestDrivers`, già in cache); per i costruttori o quando la foto non c'è, un riquadro con le iniziali sul colore del team.
- **Tabella** dalla 4ª posizione: posizione, pilota (o costruttore), squadra, vittorie, punti, con la riga leggermente colorata come le tabelle dei risultati. Larghezze fisse delle colonne, come le altre tabelle dell'app.
- **Link**: dal 2023 in poi il nome del pilota porta a `/drivers/<sigla>`; prima non è un link (verrà esteso dal progetto D).
- **Prima del 1958** il tab Costruttori mostra: "Il campionato costruttori è stato istituito nel 1958."
- **Caricamento**: skeleton a forma di podio e tabella; il cambio di stagione o di tab non deve far richiudere la pagina (altezza minima dell'area dei contenuti).
- **Errore**: se `JolpicaService.apiStatus` è `error` e non ci sono dati in cache, componente `app-api-unavailable` con "Riprova". Il componente riceve un nuovo input `source: 'openf1' | 'jolpica'` (default `'openf1'`, così le pagine esistenti non cambiano): con `'jolpica'` il testo diventa "L'archivio storico Jolpica non sta rispondendo. Riprova tra qualche istante." senza il riferimento alle sessioni live, che vale solo per OpenF1.

### Navigazione

- nuova rotta `classifiche` in `app.routes.ts`;
- voce "Classifiche" nella barra in alto (dopo "Drivers") e tra i "Link Rapidi" del footer;
- "Jolpica F1 API" tra le "Risorse" del footer.

## Flusso dei dati

1. All'apertura: in parallelo `getSeasons()`, `getLatestSeasonWithStandings()` e, solo per la stagione in corso, `getLatestDrivers()` di OpenF1 (già in cache dalle altre pagine).
2. Si caricano le classifiche della stagione selezionata: piloti subito, costruttori al primo clic sul tab.
3. Al cambio di stagione si caricano solo i dati non ancora in cache.

Richieste per una visita tipica a cache vuota: 3–4 (stagioni, stagione corrente, classifica piloti, eventualmente costruttori).

## Gestione degli errori

- 429: gestito dalla coda di `HttpCache` (attesa e nuovo tentativo), invisibile all'utente salvo un caricamento più lungo.
- Jolpica irraggiungibile con dati in cache: si mostrano i dati salvati.
- Jolpica irraggiungibile senza cache: avviso con "Riprova".
- Stagione senza classifica (vuota): messaggio "Classifica non ancora disponibile per questa stagione."
- Foto non caricata: ripiego sul riquadro con le iniziali (stessa logica `(error)` già usata nella pagina Piloti).

## Test

- `HttpCache`: cache e TTL, richieste condivise, nuovo tentativo su 429, rimozione delle voci più vecchie quando il `localStorage` è pieno, finestra di richieste rispettata.
- `Openf1ServiceService`: i 4 test esistenti invariati e verdi (garanzia che lo spostamento non cambia comportamento).
- `JolpicaService`: normalizzazione dei tipi, paginazione oltre 100 righe, costruttori vuoti prima del 1958, ripiego sull'anno precedente quando la stagione in corso non ha classifica.
- `StandingsComponent`: si crea con i provider di test; mostra podio e tabella con dati finti; mostra il messaggio del 1958; link presente solo dal 2023.
- Verifica nel browser (puppeteer + Edge, come finora): pagina a cache vuota, cambio stagione (2026, 1988, 1955), cambio tab, skeleton con risposte rallentate, avviso con Jolpica bloccata.
