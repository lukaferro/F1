# Jolpica: statistiche di carriera nel dettaglio pilota

Data: 2026-10-12
Progetto B di 5 dell'integrazione Jolpica + news (A: classifiche ✅, C: circuiti, D: storico pre-2023, E: news).

## Obiettivo

Sostituire le statistiche di carriera del dettaglio pilota, oggi estratte dalle tabelle HTML di Wikipedia (circa 200 righe di parsing fragile in `driver-detail.component.ts`), con dati Jolpica, e aggiungere una tabella stagione per stagione e un grafico delle posizioni finali.

Criteri di riuscita:

- per ogni pilota OpenF1 (dal 2023) la sezione carriera mostra esordio, GP disputati, vittorie, podi, pole, giri veloci, punti e titoli con gli anni;
- la tabella "Stagione per stagione" mostra anno, team, posizione finale, punti e vittorie, dalla stagione più recente;
- il grafico mostra la posizione finale per anno;
- i numeri compaiono prima della tabella (caricamento progressivo); un pilota già visto si riapre senza nuove richieste;
- se Jolpica non risponde, solo la sezione carriera mostra l'avviso con "Riprova": il resto della pagina resta intatto;
- la biografia di Wikipedia (testo introduttivo e link) resta com'è.

## Fuori ambito

- dettaglio dei piloti precedenti al 2023 (progetto D): l'abbinamento cerca solo nelle stagioni coperte da OpenF1;
- podi o pole per singola stagione (richiederebbero lo scaricamento di tutte le gare);
- librerie di grafici: il grafico è un SVG inline;
- Wikipedia come riserva per le statistiche (decisione presa: si elimina il parsing).

## Vincoli dell'API Jolpica (in aggiunta alla spec del progetto A)

- Ogni elenco ha `MRData.total`: con `?limit=1` si ottiene un conteggio con una richiesta leggera.
- Endpoint per pilota usati: `/drivers/{id}/results/` (GP; la prima voce è l'esordio), `/drivers/{id}/results/1|2|3/` (vittorie, secondi, terzi posti), `/drivers/{id}/qualifying/1/` (pole), `/drivers/{id}/fastest/1/results/` (giri veloci), `/drivers/{id}/seasons/` (stagioni corse).
- La classifica di un pilota richiede l'anno: non esiste un endpoint "tutte le stagioni di un pilota". Serve una richiesta per stagione.
- I punti dei risultati di gara non includono le sprint; i punti della classifica di stagione sì, per questo i punti di carriera si sommano dalle classifiche.
- Un `driverId` (es. `hamilton`, `max_verstappen`) non coincide con la sigla OpenF1: va cercato.

## Architettura

### `JolpicaService` (esteso)

Nuovi metodi pubblici:

- `findDriver(acronym: string, fullName: string): Promise<{ driverId: string; nationality: string } | null>`: cerca negli elenchi piloti delle stagioni dalla corrente al 2023 (`/{anno}/drivers/?limit=100`, una richiesta per anno, in cache), fermandosi alla prima stagione che lo contiene. Abbinamento per `code` uguale alla sigla; se nessun `code` corrisponde, per cognome (`familyName`, confronto senza accenti e senza maiuscole) contenuto nel nome completo OpenF1. `null` se non trovato.
- `getCareerTotals(driverId): Promise<CareerTotals>` con `{ races, wins, podiums, poles, fastestLaps, debut?: { season: number; raceName: string } }`: sei richieste `limit=1` in parallelo; `podiums` è la somma dei totali di P1, P2 e P3; `debut` assente se `races` è 0.
- `getDriverSeasons(driverId): Promise<number[]>`: stagioni corse, in ordine decrescente.
- `getSeasonRaceCount(season): Promise<number>`: `/{anno}/races/?limit=1` → `total`, per sapere se la stagione in corso è conclusa.

Per la posizione di ogni stagione si riusa `getDriverStandings(season)` (cache condivisa con la pagina Classifiche) filtrando per `driverId`. `DriverStanding` riceve un campo in più, `constructors: { id: string; name: string }[]` (tutte le squadre della stagione, non solo l'ultima; `constructorId` e `constructorName` restano per la pagina Classifiche). Nuovo metodo `getStandingsRound(season): Promise<number>`: legge `StandingsLists[0].round` dalla stessa prima pagina di `getDriverStandings`, quindi senza richieste in più grazie alla cache.

TTL invariati: gli URL per pilota senza anno durano 1 ora, le stagioni concluse 7 giorni; tutto è persistito nel `localStorage` dalla `HttpCache`.

### `DriverCareerComponent` (nuovo, `src/app/components/driver-career/`)

Componente standalone che possiede tutta la sezione carriera.

- Input: `acronym`, `fullName` (dal pilota OpenF1).
- Output: `nationality` (stringa Jolpica, es. `British`), emesso quando il pilota è trovato; il padre lo usa solo se OpenF1 non ha `country_code`.
- Stato: `driverId`, `totals`, `seasons` (righe della tabella, ognuna `loading` / caricata / errore), `error`.

### `DriverDetailComponent` (ridotto)

- Rimossi: `loadWikipediaStats`, `parseWikipediaHtmlStats`, `cleanWikiValue`, `normalizeLabel`, `extractCountryCode`, `formatTeamEntry`, `careerStats`, `loadingStats` e la mappa `wikiNameVariants` duplicata (resta una sola copia, quella del campo di classe, usata dalla biografia).
- Il template sostituisce la sezione "Statistiche Carriera" con `<app-driver-career>`.
- La nazionalità senza `country_code` si converte con una mappa `nationality → codice a 3 lettere` (circa 30 nazionalità dei piloti dal 2023) in `src/app/utils/nationality.ts`, così la bandiera continua a comparire. Il commento del template "la nazionalità può arrivare dopo, dalle statistiche di Wikipedia" si aggiorna di conseguenza.

## Interfaccia

**Riquadri** (stessi stili della griglia carriera attuale): Esordio (nome del GP e anno), GP disputati, Vittorie, Podi, Pole, Giri veloci, Punti, Titoli. Sotto i Titoli, gli anni dei mondiali vinti. Punti e Titoli mostrano lo skeleton finché tutte le stagioni non sono caricate.

**Tabella "Stagione per stagione"**, dalla più recente: Anno · Team · Pos. · Punti · Vittorie.

- Team con logo e colore da `constructor-branding`; se il pilota ha cambiato squadra in stagione, tutte le squadre separate da " / ".
- La stagione in corso ha l'etichetta "in corso".
- Le righe delle stagioni vinte sono evidenziate in oro.
- Larghezze fisse delle colonne, come le altre tabelle dell'app; le righe entrano con l'animazione già usata in Classifiche.

**Grafico "Posizione finale"**: SVG inline, larghezza fluida.

- Asse X: le stagioni in ordine cronologico; asse Y: posizione, P1 in alto, scala fino alla peggiore posizione del pilota (minimo P10).
- Un punto per stagione con il colore del team (ultima squadra della stagione), uniti da una linea; il segmento verso la stagione in corso è tratteggiato.
- Etichette dell'asse X diradate quando le stagioni sono molte (una ogni 2 oltre 12, una ogni 5 oltre 24).
- Con meno di due stagioni il grafico non compare.
- `role="img"` e `aria-label` con la sintesi (es. "Posizione finale dal 2007 al 2026, migliore: 1ª").

**Stagione conclusa**: un anno precedente a quello corrente è sempre concluso; per l'anno corrente è concluso solo se `getStandingsRound(anno)` è uguale a `getSeasonRaceCount(anno)`. Un primo posto in una stagione non conclusa non è un titolo.

## Flusso dei dati

1. `findDriver(acronym, fullName)` → `driverId` e nazionalità (emessa al padre).
2. In parallelo `getCareerTotals` e `getDriverSeasons` → riquadri (tranne Punti e Titoli) e righe della tabella in stato di caricamento.
3. Classifiche delle stagioni dalla più recente alla più vecchia (la coda della `HttpCache` le distribuisce a 4 al secondo); ogni risposta riempie la sua riga e il grafico.
4. Quando tutte le stagioni sono caricate: Punti (somma) e Titoli.

Richieste a cache vuota: 1–4 per l'abbinamento (spesso già in cache), 7 per totali e stagioni, 1 per il calendario dell'anno corrente, più una per stagione corsa. Esempi: Antonelli circa 10, Hamilton circa 30 (circa 8 secondi al primo caricamento, poi immediato). Le classifiche delle stagioni già aperte in Classifiche non vengono richieste di nuovo.

## Gestione degli errori

- Jolpica irraggiungibile ai passi 1–2 senza cache: la sezione mostra `app-api-unavailable` con `source="jolpica"` e "Riprova"; la pagina resta intatta.
- Pilota non trovato o senza gare (`races` 0): "Questo pilota non ha ancora disputato gare in F1."
- Errore su una singola stagione: la riga mostra "—", Punti e Titoli mostrano "—" invece di totali parziali, e compare un link "Riprova" che ricarica solo le stagioni mancanti (le altre sono in cache).
- Cambio di pilota durante il caricamento: ogni caricamento ha un numero di sequenza e le risposte di un caricamento superato vengono ignorate (stesso schema della pagina Classifiche).
- 429: gestito dalla coda di `HttpCache`, invisibile salvo un caricamento più lungo.

## Test

- `JolpicaService`: `findDriver` per sigla, per cognome (con accenti) e `null`; `getCareerTotals` legge i `total` e somma i podi, `debut` dalla prima gara e assente con 0 gare; `getDriverSeasons` in ordine decrescente; `constructors` con più squadre in stagione; la pagina Classifiche continua a funzionare (test esistenti verdi).
- `DriverCareerComponent`: riquadri prima delle stagioni; Punti e Titoli solo a stagioni complete; titolo non contato per la stagione in corso non conclusa; riga in errore → Punti "—" e "Riprova"; avviso Jolpica; pilota senza gare; risposte di un pilota precedente ignorate; grafico assente con una sola stagione.
- `nationality.ts`: conversione delle nazionalità note e `undefined` per quelle sconosciute.
- `DriverDetailComponent`: i test esistenti restano verdi.
- Verifica nel browser (puppeteer + Edge, come finora): Hamilton (molte stagioni, titoli), Antonelli (stagione in corso), de Vries (solo 2023), un pilota con cambio di squadra in stagione (es. Lawson 2025), Jolpica bloccata.
