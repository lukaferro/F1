# Roadmap di Sviluppo F1 App

Questo documento tiene traccia delle funzionalità pianificate e del loro stato di avanzamento.

---

## 1. Home & Prossimo Gran Premio (Completato) ✅
- **Card "Classifiche" in Home**: Aggiunta della quarta card nella griglia "Scopri la Formula 1" (Gran Premi, Circuiti, Piloti, Classifiche) con anteprima e link diretto a `/classifiche`.
- **Widget Prossimo Gran Premio (Next Race / Last Race)**:
  - Rilevamento automatico del prossimo Gran Premio in calendario (o dell'ultimo disputato se stagione conclusa).
  - Countdown dinamico al weekend di gara (giorni, ore, minuti) o stato della sessione.
  - Informazioni chiave: Nome Gran Premio, data, circuito, località, bandiera del paese e pulsante rapido per aprire i dettagli (mostrato solo per le gare già disputate o in corso).

---

## 2. Navigazione rapida Gran Premi (Completato) ✅
- **Navigazione sequenziale tra round**: Nei dettagli dei Gran Premi storici (`/granpremi/storico/:season/:round`) e moderni (`/granpremi/:id`), pulsanti "← Gara precedente (Round X-1)" e "Gara successiva (Round X+1) →" con il nome del Gran Premio.
- Permette di sfogliare un'intera stagione gara per gara senza dover tornare alla lista dei Gran Premi (escludendo i GP futuri non ancora disputati).

---

## 3. Ricerca e filtri avanzati per i Circuiti (Completato) ✅
- **Barra di ricerca circuiti**: Ricerca in tempo reale per nome circuito, città o nazione.
- **Filtri e ordinamento**:
  - Filtro per paese e continente.
  - Ordinamento per lunghezza tracciato, numero di curve o anno del primo GP disputato.
- **Collegamento gare**: Pulsante rapido "Edizioni GP" su ogni circuito per visualizzare le gare disputate su quel tracciato.

---

## 4. Confronto Piloti Testa a Testa (Head-to-Head) (Completato) ✅
- Sezione di confronto interattiva tra due piloti qualsiasi dal 1950 a oggi con sfide rapide preimpostate (*Senna vs Prost*, *Schumacher vs Hamilton*, *Verstappen vs Leclerc*, *Alonso vs Vettel*, *Lauda vs Hunt*).
- Statistiche comparative a barre:
  - Titoli Mondiali vinti (con anni dei titoli)
  - Gran Premi corsi e vittorie
  - Percentuale di vittorie su gare disputate
  - Podi totali e Pole Position
  - Giri veloci in gara.

---

## 5. Sezione News F1 & Ultime dal Paddock (Completato) ✅
- **Pagina dedicata `/news`**:
  - Feed notizie Formula 1 in lingua italiana con caching e articoli di approfondimento di fallback.
  - Notizia in **Primo Piano (Hero Article)** e griglia notizie con filtro per categoria (*Tutte*, *Gare & Paddock*, *Scuderie*, *Piloti*, *Tecnica*) e barra di ricerca testuale.
  - Modale di lettura rapida dell'articolo con link diretto alla fonte originale.
- **Anteprima in Home**: Sezione *"Ultime Notizie F1"* con le 3 notizie più recenti e collegamento rapido a `/news`.

---

## 6. Sezione Scuderie / Costruttori (Da fare) 🏎️
- Pagina dedicata alle scuderie della stagione in corso e ai costruttori storici della Formula 1 (Ferrari, McLaren, Williams, Red Bull, Mercedes, ecc.) con colori ufficiali, palmarès, mondiali vinti e piloti.

---

## 7. Strategie Gomme & Stint nei dettagli Gran Premio (Da fare) 🛞
- Visualizzazione grafica delle mescole utilizzate giro per giro (*Soft*, *Medium*, *Hard*, *Inter*, *Wet*) e dei pit-stop per ogni pilota nel dettaglio dei Gran Premi moderni tramite OpenF1 (`/stints`).

---

## 8. Albo d'Oro (Hall of Fame 1950-Oggi) (Da fare) 🏆
- Riepilogo storico completo dal 1950 a oggi di tutti i Campioni del Mondo Piloti e Costruttori stagione per stagione.
