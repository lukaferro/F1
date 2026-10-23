# Roadmap di Sviluppo F1 App

Questo documento tiene traccia delle funzionalità pianificate e del loro stato di avanzamento.

---

## Fase 1 — Core & Archivio Storico (Completata) ✅

### 1. Home & Prossimo Gran Premio (Completato) ✅
- **Card "Classifiche" in Home**: Aggiunta della quarta card nella griglia "Scopri la Formula 1" (Gran Premi, Circuiti, Piloti, Classifiche) con anteprima e link diretto a `/classifiche`.
- **Widget Prossimo Gran Premio (Next Race / Last Race)**:
  - Rilevamento automatico del prossimo Gran Premio in calendario (o dell'ultimo disputato se stagione conclusa).
  - Countdown dinamico al weekend di gara (giorni, ore, minuti) o stato della sessione.
  - Informazioni chiave: Nome Gran Premio, data, circuito, località, bandiera del paese e pulsante rapido per aprire i dettagli (mostrato solo per le gare già disputate o in corso).

---

### 2. Navigazione rapida Gran Premi (Completato) ✅
- **Navigazione sequenziale tra round**: Nei dettagli dei Gran Premi storici (`/granpremi/storico/:season/:round`) e moderni (`/granpremi/:id`), pulsanti "← Gara precedente (Round X-1)" e "Gara successiva (Round X+1) →" con il nome del Gran Premio.
- Permette di sfogliare un'intera stagione gara per gara senza dover tornare alla lista dei Gran Premi (escludendo i GP futuri non ancora disputati).

---

### 3. Ricerca e filtri avanzati per i Circuiti (Completato) ✅
- **Barra di ricerca circuiti**: Ricerca in tempo reale per nome circuito, città o nazione.
- **Filtri e ordinamento**:
  - Filtro per paese e continente.
  - Ordinamento per lunghezza tracciato, numero di curve o anno del primo GP disputato.
  - **Collegamento gare**: Pulsante rapido "Edizioni GP" su ogni circuito per visualizzare le gare disputate su quel tracciato.

---

### 4. Confronto Piloti Testa a Testa (Head-to-Head) (Completato) ✅
- Sezione di confronto interattiva tra due piloti qualsiasi dal 1950 a oggi con sfide rapide preimpostate (*Senna vs Prost*, *Schumacher vs Hamilton*, *Verstappen vs Leclerc*, *Alonso vs Vettel*, *Lauda vs Hunt*).
- Statistiche comparative a barre:
  - Titoli Mondiali vinti (con anni dei titoli)
  - Gran Premi corsi e vittorie
  - Percentuale di vittorie su gare disputate
  - Podi totali e Pole Position
  - Giri veloci in gara.

---

### 5. Sezione News F1 & Ultime dal Paddock (Completato) ✅
- **Pagina dedicata `/news`**:
  - Feed RSS XML reali in lingua italiana (*La Gazzetta dello Sport*, *Motorsport.com Italia*, *FormulaPassion*) con parser nativo e caching.
  - Notizia in **Primo Piano (Hero Article)** e griglia notizie con filtro per categoria (*Tutte*, *Gare & Paddock*, *Scuderie*, *Piloti*, *Tecnica*) e barra di ricerca testuale.
  - **Lettore Articolo Integrale in-app**: estrazione automatica dell'intero testo dell'articolo (`JSON-LD articleBody` e paragrafi HTML tramite proxy) per leggere l'articolo completo direttamente sul sito senza dover uscire, con apertura diretta anche dalle card in Home.
- **Anteprima in Home**: Sezione *"Ultime Notizie F1"* con le 3 notizie più recenti e apertura diretta dell'articolo integrale.

---

### 6. Sezione Scuderie / Costruttori (Completato) ✅
- **Pagina dedicata `/scuderie`**:
  - Esplorazione di tutte le scuderie della stagione in corso e dell'archivio storico dal 1958 a oggi.
  - Card scuderia con colori e loghi ufficiali, bandiera nazionale, sede, Power Unit, anno di debutto, punti e vittorie di stagione.
  - **Palmarès Mondiale Costruttori** (numero di titoli vinti ed elenco degli anni iridati) e filtro rapido *"Solo Campioni del Mondo"*.
  - Elenco dei **piloti della stagione** per ciascuna scuderia con punti e link diretto alla scheda carriera.

---

### 7. Strategie Gomme & Stint nei dettagli Gran Premio (Completato) ✅
- **Riepilogo KPI Strategie Gomme**: Card di sintesi sopra la tabella stint con *Mescola più usata (% giri)*, *Stint più lungo (pilota, mescola e giri)* e *Media cambi gomme per pilota*.
- **Dettaglio Soste e Giri Stint**: Colonna dedicata con numero di soste, giri esatti di pit-stop (`G15, G38`) e conteggio giri direttamente nei segmenti della barra grafica.
- **Pit Stop più veloce della sessione**: Banner di evidenziazione e badge `BEST` sul pit-stop più rapido registrato nella sessione.

---

### 8. Albo d'Oro (Hall of Fame 1950-Oggi) (Completato) ✅
- **Tab dedicato `🏆 Albo d'Oro (1950–Oggi)` in `/classifiche`**:
  - Riepilogo storico completo dal 1950 a oggi di tutti i Campioni del Mondo Piloti e Costruttori stagione per stagione.
  - Bacheca interattiva **Pluricampioni Piloti** e **Pluricampioni Costruttori** cliccabile per filtrare i titoli.
  - Filtri per epoca/decennio (*Anni ’50* – *Anni 2020*) e barra di ricerca per anno, pilota o scuderia.
  - Collegamento diretto alla scheda pilota e pulsante rapido *"Classifica stagione →"* per aprire la classifica completa di quell'anno.

---

## Fase 2 — Design System, Analisi Dati & Funzionalità Avanzate 🚀

### 9. Restyling UI, Design System Uniforme, Footer Compatto & Nuova Home (Completato) ✅
- **Design System globale (`styles.css`)**: Variabili CSS unificate per palette colori, superfici card, bordi, raggi, tipografia e pulsanti privi di aloni invasivi.
- **Componenti UI riutilizzabili**: Intestazioni di sezione (`SectionHeaderComponent`) e card KPI uniformi.
- **Footer compatto e pulito**: Rimozione della griglia sponsor e riduzione drastica dell'altezza con layout orizzontale essenziale.
- **Restyling Home**:
  - Hero modernizzata con doppia call-to-action e barra KPI stagionale integrata.
  - Griglia *"Esplora l'Universo F1"* a 6 card custom uniformi (*Gran Premi*, *Circuiti*, *Piloti*, *Scuderie*, *Classifiche & Albo d'Oro*, *News*).

---

### 10. Andamento del Campionato (Grafico Evoluzione Punti) 📈 (Completato) ✅
- **Grafico interattivo in `/classifiche`** (sia nel tab *Piloti* sia nel tab *Costruttori*):
  - Progressione cumulativa dei punti gara dopo gara (Round 1 → Finale), inclusi i punti delle Sprint Race dal 2021 in poi.
  - Selettore rapido **Top 5 / Top 8 / Top 10** e legenda interattiva per attivare/disattivare o mettere in risalto singoli piloti e scuderie (con linea tratteggiata automatica per il secondo pilota dello stesso team).
  - **Ispettore Round interattivo**: passando il cursore o cliccando su qualsiasi round del grafico viene mostrato il riepilogo del Gran Premio (nome, circuito, data) con il totale cumulativo e il bonus punti (`+pt`) ottenuto in quel weekend da ciascun contendente.

---

### 11. Confronto Telemetria e Tempi sul Giro (Lap-by-Lap & Telemetry) 🏎️ (Completato) ✅
- Nei dettagli dei Gran Premi moderni (`/granpremi/:id`), tab dedicato **`Telemetria & Giri`** per il confronto diretto tra 2 piloti qualsiasi della sessione (con selettori rapidi e pulsante d'inversione `VS`):
  - **KPI comparativi di sessione**: Giro più veloce e delta, Passo medio sui giri puliti, Velocità di punta (*Speed Trap*) e confronto intertempi settore per settore (`S1 · S2 · S3`).
  - **Grafico comparativo dei tempi sul giro (Lap-by-Lap)**: tracciato SVG interattivo con indicatori colore della **mescola gomme** su ogni giro, filtro rapido dei giri anomali (*Pit Out / Safety Car*) e **Ispettore Giro** con tempi, età gomma, settori e caricamento diretto della telemetria di qualsiasi giro.
  - **Confronto telemetrico sincronizzato sul giro più veloce**: 4 canali grafici SVG allineati sullo sviluppo del tracciato (`0% → 100%`) per **Velocità (`km/h`)**, **Acceleratore (`%`)**, **Freno (`%`)** e **Marcia (`1ª–8ª`) / Zone DRS**, con cursore sincronizzato e ispettore in tempo reale.

---

### 12. Team Radio & Race Control Migliorati 📻 (Completato) ✅
- Tab **`Direzione Gara`** (Race Control) nei dettagli Gran Premio con messaggi ufficiali FIA in tempo reale:
  - Filtri per tipologia di evento e bandiere (*Tutti*, *Bandiera Rossa*, *Safety Car*, *VSC*, *Penalità & Investigazioni*, *DRS*).
  - Ricerca testuale per messaggio, pilota o curva e filtro per singolo pilota.
  - Badge cromatici dedicati per bandiere (*Rossa, Gialla, Verde, Blu, Scacchi, Bianco/Nera*), settore e giro di riferimento.
- Tab **`Team Radio`** arricchito:
  - Filtro istantaneo per pilota e ricerca testuale.
  - Ordinamento cronologico reversibile (*Dal primo all'ultimo* ↔ *Dal più recente*).
  - Player audio avanzato con indicatore di riproduzione, slider interattivo per scorrere la traccia, timing in tempo reale (`currentTime / duration`) e link diretto all'audio originale MP3.

---

### 13. Calendario Mondiale & Vista Geografica Circuiti 🌍 (Completato) ✅
- **Selettore Tripla Vista in `/circuits`**:
  - `🏎️ Schede Circuiti`: Griglia completa espansa a tutti i 24 circuiti ufficiali del campionato con ricerca testuale, filtri per continente/paese, ordinamento e link rapidi alle edizioni del GP.
  - `🌍 Mappa Geografica Interattiva`:
    - Planisfero vettoriale SVG in proiezione equirettangolare scura con reticolo geografico (Equatore, Tropici, Greenwich) e continenti sagomati.
    - 24 pin geografici geolocalizzati con coordinate reali, alone pulsante colorato per macro-regione e badge numerato del Round.
    - Chip di selezione e zoom automatico per macro-regione (*Tutto il Mondo*, *Tour Europeo*, *Le Americhe*, *Medio Oriente & Golfo*, *Asia & Pacifico*).
    - Rotta di volo stagionale intercontinentale tratteggiata e animata con toggle di attivazione.
    - **Ispettore Circuito su Mappa**: drawer laterale interattivo con anteprima grafica del layout, dati tecnici (lunghezza, curve, debutto), record della pista con pilota/tempo/anno e pulsanti di navigazione rapida.
  - `🗓️ Calendario & Macro-Aree`:
    - Banner KPI di sintesi: 24 Gran Premi, 4 macro-aree continentali, 131.2 km totali di asfalto da corsa e 390 curve.
    - Raggruppamento per macro-fasi geografiche (*Tour Europeo*, *Le Americhe*, *Medio Oriente & Golfo*, *Asia & Pacifico*) con statistiche aggregate (km totali e media curve per fase).
    - Lista cronologica dei Gran Premi con badge round, località, caratteristiche tecniche e pulsanti rapidi *"Mappa 🌍"* e *"Edizioni GP 🏁"*.

---

### 14. Preferiti / Il Mio Garage ⭐
- Possibilità di salvare piloti, scuderie e circuiti preferiti in `localStorage` tramite pulsante stella su card e profili.
- Sezione rapida *"Il Mio Garage"* in Home per accedere subito ai propri preferiti e alle loro statistiche.

---

### 15. Simulatore Punti & Calcolatore Matematico Titolo Mondiale 🧮
- Strumento interattivo in `/classifiche` per simulare l'esito dei prossimi Gran Premi / Sprint e calcolare istantaneamente la nuova classifica e le combinazioni matematiche per la conquista del titolo.
