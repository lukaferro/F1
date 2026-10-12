# Jolpica: piloti storici (dal 1950)

Data: 2026-10-12
Progetto D2 dell'integrazione Jolpica + news. Il progetto D (storico pre-2023) è diviso in D2 (piloti, questa spec) e D1 (Gran Premi, dopo). Progetti già fatti: A (Classifiche), B (carriera nel dettaglio pilota).

## Obiettivo

OpenF1 copre solo dal 2023. Rendere consultabili tutti i piloti della F1 dal 1950: elenco per stagione, ricerca su tutti, pagina di dettaglio per ognuno. Nello stesso lavoro, la biografia di Wikipedia si carica più in fretta anche per i piloti attuali.

Criteri di riuscita:

- nella pagina Piloti il selettore Anno va dal 1950 all'anno corrente; per gli anni prima del 2023 compaiono i piloti di quella stagione con la scuderia, il suo colore e la posizione finale;
- senza anno si vede la griglia della stagione in corso, colorata per scuderia (oggi tutti i piloti dal 2023 in grigio); la ricerca senza anno trova qualsiasi pilota dal 1950 (es. "Senna", "Schumacher");
- ogni pilota precedente al 2023 si apre in `/drivers/storico/<driverId>` con foto, dati anagrafici, biografia e la sezione carriera del progetto B;
- nella pagina Classifiche i piloti storici diventano cliccabili;
- la biografia dei piloti (storici e attuali) richiede al massimo 2 richieste a Wikipedia quando il titolo della pagina è noto;
- la pagina dei piloti dal 2023 (`/drivers/<sigla>`) mantiene il comportamento attuale.

## Fuori ambito

- Gran Premi precedenti al 2023 (progetto D1);
- foto diverse da quelle di Wikipedia per i piloti storici;
- unificare le due pagine di dettaglio in una sola rotta (scartato: rischio alto, link esistenti da cambiare).

## Vincoli

- Jolpica: limite reale osservato circa 18 richieste ogni 10 secondi (la coda usa 550 ms tra le partenze), 500 all'ora; i 429 arrivano senza CORS.
- Ogni pilota Jolpica ha `url` verso la pagina inglese di Wikipedia (es. `http://en.wikipedia.org/wiki/Ayrton_Senna`): il titolo è la parte dopo `/wiki/`, da decodificare.
- Wikipedia `prop=pageimages` accetta fino a 50 titoli per richiesta; circa l'80% dei piloti storici ha una foto (verificato sul 1975: 40 su 50). Le foto sono spesso immagini in pista, non ritratti.
- Elenco completo piloti: `/drivers/?limit=100`, 881 piloti, 9 pagine.
- Il `driverId` Jolpica può essere di tre lettere (es. `ide`): non va mescolato con le sigle OpenF1 nella stessa rotta.

## Architettura

### `JolpicaService` (esteso)

- `DriverStanding` riceve `wikiTitle?: string` (titolo della pagina inglese, dal campo `Driver.url`).
- `getDriver(driverId): Promise<JolpicaDriver | null>` — `/drivers/<id>/`; `null` se il pilota non esiste (lista vuota o 404). Tipo pubblico:
  `{ driverId, code?, permanentNumber?, givenName, familyName, fullName, dateOfBirth?, nationality, wikiTitle? }`.
- `getAllDrivers(): Promise<JolpicaDriver[]>` — tutte le pagine di `/drivers/?limit=100&offset=…` (riusa `getAllPages`).
- `JolpicaDriverMatch` (da `findDriver`) riceve `wikiTitle?: string`.
- Funzione esportata `wikiTitleFromUrl(url: string | undefined): string | undefined`.

### `WikipediaService` (nuovo, `src/app/services/wikipedia.service.ts`)

Raccoglie le chiamate a Wikipedia oggi dentro `DriverDetailComponent`.

- `getBio(options: { title?: string; searchNames: string[] }): Promise<{ extract: string; url: string; image?: string } | null>`:
  - con `title`: richiesta alla pagina inglese con `prop=extracts|pageimages|langlinks&lllang=it&exintro=1&explaintext=1&redirects=1`; se esiste la versione italiana, seconda richiesta per il suo estratto; altrimenti estratto inglese. Al massimo 2 richieste.
  - senza `title`: ricerca per nome come oggi (it poi en, varianti dei nomi), comportamento invariato.
- `getImages(titles: string[]): Promise<Map<string, string>>` — foto in blocchi da 50 titoli (`prop=pageimages&piprop=thumbnail&pithumbsize=400&redirects=1`), chiave = titolo richiesto (seguendo i redirect).
- Cache semplice in memoria per titolo; nessun limite di frequenza particolare (Wikipedia non ne impone per questo uso).

### `WikipediaBioComponent` (nuovo, `src/app/components/wikipedia-bio/`)

Il pannello "Profilo" estratto da `DriverDetailComponent` (stesso aspetto: testo, link "Leggi su Wikipedia", skeleton, messaggio "Dati biografici non ancora disponibili…").

- Input: `title?: string` (titolo della pagina inglese), `name: string` (per la ricerca quando manca il titolo), `waiting: boolean` (true finché il padre non sa ancora se avrà un titolo: mostra lo skeleton senza richieste).
- La frase iniziale ("Corre per … con il numero …") resta al padre e viene proiettata con `<ng-content>` sopra il testo di Wikipedia.
- Si ricarica quando cambiano gli input; risposte superate ignorate (numero di sequenza).

### `DriverCareerComponent` (esteso)

- Nuovo input opzionale `driverId`: se presente salta `findDriver`.
- L'output `nationality` diventa `matched: EventEmitter<{ nationality: string; wikiTitle?: string } | null>`.

### `DriverDetailComponent` (pagina dal 2023)

- Usa `WikipediaBioComponent`; il titolo arriva da `matched` della sezione carriera. Finché `matched` non è arrivato la biografia mostra lo skeleton; se arriva `null` la biografia cerca per nome come oggi.
- Rimossi `loadWikipediaInfo`, `wikiExtract`, `wikiUrl`, `loadingWiki`, `wikiNameVariants` (spostati in `WikipediaService`) e l'uso diretto di `HttpClient`.

### `HistoricDriverDetailComponent` (nuovo, `src/app/components/historic-driver-detail/`, rotta `drivers/storico/:driverId`)

- Testata come la pagina attuale: foto da Wikipedia (`getImages([wikiTitle])`) o iniziali sul colore dell'ultima squadra, nome completo, bandiera da `nationalityToCountryCode`, badge del numero se `permanentNumber`.
- Pannello "Informazioni": Nazionalità, Data di nascita (formato italiano, es. "21 marzo 1960"), Numero (se presente), Stagioni (prima–ultima, da `getDriverSeasons`), Ultima scuderia (il componente chiama `getDriverStandings(ultima stagione)`: stessa richiesta della sezione carriera, quindi condivisa dalla cache senza costi in più).
- `WikipediaBioComponent` con `title` = `wikiTitle`.
- `DriverCareerComponent` con `driverId`.
- Pulsante "Torna ai Piloti".

### Pagina Piloti (`DriversComponent`)

- Anni: dal 1950 all'anno corrente nel selettore (da `JolpicaService.getSeasons()`, unito agli anni OpenF1).
- Anno ≥ 2023: comportamento attuale.
- Anno < 2023: `getDriverStandings(anno)` → card con nome, scuderia, colore `#` + `constructorColor`, "P<posizione>" e foto da `getImages` (titoli della stagione in blocchi da 50); senza foto, iniziali sul colore della squadra. Link `/drivers/storico/<driverId>`.
- Senza anno: i piloti della stagione più recente (OpenF1) con il colore della loro scuderia; oggi invece compaiono tutti i piloti dal 2023 in grigio.
- Ricerca:
  - con un anno: filtra le card mostrate (come oggi);
  - senza anno e con testo: alla prima ricerca carica `getAllDrivers()` e mostra i piloti il cui nome contiene il testo (senza accenti/maiuscole), al massimo 48 risultati con nota "Affina la ricerca" oltre; card con nome, bandiera della nazionalità, bordo neutro, foto da `getImages`. Link: `/drivers/<code>` se il `code` del pilota coincide con la sigla di un pilota OpenF1 già caricato dalla pagina (stagioni dal 2023), altrimenti `/drivers/storico/<driverId>`.
- Card dei piloti dal 2023 invariate.

### Classifiche

- `driverLink`: stagioni ≥ 2023 con `code` → `/drivers/<code>` (invariato); altrimenti `/drivers/storico/<driverId>`.

### `nationality.ts`

Aggiunte le nazionalità storiche con il codice a 3 lettere e, dove manca, la voce in `countryCodeMapping` per la bandiera: tra le altre Rhodesian (`RHO` → `zw`), East German (`GDR` → `de`), Uruguayan (`URU`), Chilean (`CHI`), South African (`RSA`), Portuguese (`POR`), Irish (`IRL`), Hungarian (`HUN`), Czech (`CZE`), Malaysian (`MAS`), Indonesian (`INA`), Liechtensteiner (`LIE`), Hong Kong (`HKG`), Monegasque già presente. L'elenco esatto si ricava da `/drivers/` (tutte le nazionalità distinte) durante l'implementazione.

## Flusso dei dati

- Pagina Piloti, anno storico: 1–2 richieste Jolpica (classifica, spesso già in cache) + 1–2 richieste Wikipedia per le foto.
- Ricerca senza anno: 9 richieste Jolpica alla prima ricerca (poi cache 1 h, persistente) + 1 richiesta Wikipedia per le foto dei risultati.
- Dettaglio storico: 1 richiesta `getDriver` + richieste della sezione carriera (come progetto B, senza `findDriver`) + 2 Wikipedia (biografia, con foto inclusa nella prima).

## Gestione degli errori

- `driverId` inesistente: "Pilota non trovato" e "Torna ai Piloti".
- Jolpica irraggiungibile: `app-api-unavailable source="jolpica"` con "Riprova" (dettaglio storico, pagina Piloti su anno storico, ricerca senza anno); la griglia attuale non è toccata.
- Wikipedia irraggiungibile o pagina assente: pannello biografia con il messaggio esistente; foto → iniziali.
- Cambio di anno o di ricerca durante il caricamento: le risposte superate vengono ignorate.

## Test

- `JolpicaService`: `getDriver` (trovato, `null`), `getAllDrivers` con paginazione, `wikiTitle` nelle righe di classifica e in `findDriver`, `wikiTitleFromUrl` (decodifica, URL senza `/wiki/`).
- `WikipediaService`: con titolo e versione italiana (2 richieste), senza versione italiana (estratto inglese, 1 richiesta), senza titolo (ricerca per nome), `getImages` in blocchi da 50 e con redirect.
- `WikipediaBioComponent`: testo e link, skeleton, messaggio di assenza, risposta superata ignorata.
- `DriverCareerComponent`: con `driverId` non chiama `findDriver`; `matched` con `wikiTitle`.
- `HistoricDriverDetailComponent`: rendering con dati finti, 404, avviso Jolpica.
- `DriversComponent`: anno storico (colore, posizione, link storico), ricerca senza anno su tutti (limite 48), link `/drivers/<code>` per i piloti della griglia.
- `StandingsComponent`: link storico prima del 2023.
- `nationality.ts`: nazionalità storiche.
- Verifica nel browser: Senna (1984–1994), Fangio (anni '50), un pilota senza foto, ricerca "Schumacher" (Michael, Ralf, Mick), Hamilton con biografia veloce, Jolpica bloccata, larghezza 375 px.
