# Roadmap di Sviluppo F1 App

Questo documento tiene traccia delle funzionalità pianificate e del loro stato di avanzamento.

---

## 1. Home & Prossimo Gran Premio (Completato) ✅
- **Card "Classifiche" in Home**: Aggiunta della quarta card nella griglia "Scopri la Formula 1" (Gran Premi, Circuiti, Piloti, Classifiche) con anteprima e link diretto a `/classifiche`.
- **Widget Prossimo Gran Premio (Next Race / Last Race)**:
  - Rilevamento automatico del prossimo Gran Premio in calendario (o dell'ultimo disputato se stagione conclusa).
  - Countdown dinamico al weekend di gara (giorni, ore, minuti) o stato della sessione.
  - Informazioni chiave: Nome Gran Premio, data, circuito, località, bandiera del paese e pulsante rapido per aprire i dettagli.

---

## 2. Navigazione rapida Gran Premi storici (Completato) ✅
- **Navigazione sequenziale tra round**: Nei dettagli dei Gran Premi storici (`/granpremi/storico/:season/:round`), pulsanti "← Gara precedente (Round X-1)" e "Gara successiva (Round X+1) →" con il nome del Gran Premio.
- Permette di sfogliare un'intera stagione storica gara per gara senza dover tornare alla lista dei Gran Premi.

---

## 3. Ricerca e filtri avanzati per i Circuiti (Da fare) 🏎️
- **Barra di ricerca circuiti**: Ricerca in tempo reale per nome circuito, città o nazione.
- **Filtri e ordinamento**:
  - Filtro per paese / continente.
  - Ordinamento per lunghezza tracciato, numero di curve o anno del primo GP disputato.
- **Collegamento gare**: Elenco o link rapidi alle edizioni del Gran Premio corse su ciascun circuito.

---

## 4. Confronto Piloti Testa a Testa (Head-to-Head) (Da fare) ⚔️
- Nuova sezione o modale di confronto tra due piloti (storici o moderni, es. *Senna vs Prost*, *Schumacher vs Hamilton*, *Verstappen vs Leclerc*).
- Statistiche comparative a barre:
  - Titoli Mondiali vinti
  - Gran Premi corsi e vittorie
  - Podi totali e Pole Position
  - Giri veloci in gara
  - Percentuale di vittorie su gare disputate.
