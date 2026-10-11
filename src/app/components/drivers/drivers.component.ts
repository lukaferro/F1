import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { currentSeasonPhotoUrl, hiResHeadshotUrl } from '../../utils/f1-media';

interface YearOption {
  label: string;
  value: number | null;
}

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, DropdownModule, InputTextModule, ApiUnavailableComponent],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);
  private readonly excludedDrivers = new Set<string>(['FELIPE DRUGOVICH']);

  drivers: Driver[] = [];
  allDrivers: Map<number, Driver[]> = new Map(); // Map<year, drivers[]>
  filteredDrivers: Driver[] = [];
  loading = false;
  error?: string;

  years: YearOption[] = [];
  selectedYear: number | null = null;
  searchQuery: string = '';

  // Colori predefiniti per i team (stessi usati in gran-premi-detail)
  teamColors: { [key: string]: string } = {
    'Red Bull Racing': '1D19AC',
    'Mercedes': '00D7B6',
    'Ferrari': 'ED1131',
    'McLaren': 'F47600',
    'Aston Martin': '229971',
    'Alpine': '00A1E8',
    'AlphaTauri': '6C98FF',
    'Alfa Romeo': 'C92D4B',
    'Haas F1 Team': '9C9FA2',
    'Williams': '1868DB',
    'RB': '6692FF',
    'Kick Sauber': '01C00E',
    'Racing Bulls': '6C98FF',
    'Audi': 'F50537',
    'Cadillac': '909090'
  };
  
  // Mappa dei piloti con foto ufficiali da Formula1.com (chiavi in MAIUSCOLO "Nome Cognome")
  private readonly driverPhotos: { [key: string]: string } = {
    'MAX VERSTAPPEN': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS92ZXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'SERGIO PEREZ': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMi9kcml2ZXJzL2hlYWRzaG90cy9mMS9wZXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'GEORGE RUSSELL': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/george-russell.png?im=Resize,width=270',
    'CHARLES LECLERC': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9sZWMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'CARLOS SAINZ': 'https://cdn.williamsf1.tech/images/fnx611yr/production/6971f174c05a7f0397e2cbe32cd42ab0255f2dce-3136x3135.png?rect=1,0,3135,3135&w=625&h=625&auto=format',
    'LANDO NORRIS': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9ub3IucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'OSCAR PIASTRI': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9waWEucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'FERNANDO ALONSO': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9hbG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LANCE STROLL': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9zdHIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'ESTEBAN OCON': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/esteban-ocon.png?im=Resize,width=270',
    'PIERRE GASLY': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9nYXMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'YUKI TSUNODA': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/yuki-tsunoda.png?im=Resize,width=270',
    'DANIEL RICCIARDO': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9yaWMucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'VALTTERI BOTTAS': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9ib3QucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'GUANYU ZHOU': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS96aG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'KEVIN MAGNUSSEN': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9tYWcucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'NICO HULKENBERG': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/nico-hulkenberg.png?im=Resize,width=270',
    'ALEXANDER ALBON': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9hbGIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LOGAN SARGEANT': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9zYXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'OLIVER BEARMAN': 'https://www.olliebearman.com/media/pages/home/b4d938add1-1740818186/about-home-1200x.webp',
    'FRANCO COLAPINTO': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/franco-colapinto.png?im=Resize,width=270',
    'ANDREA KIMI ANTONELLI': 'https://images.ctfassets.net/1fvlg6xqnm65/5YiTw6xQHuM94ty9yLDnyk/ff67d40c690940307f48d1b370352577/Kimi_Antonelli.png',
    'ISACK HADJAR' : 'https://soymotor.com/sites/default/files/2025-03/ihadjar_2025.png',
    'NYCK DE VRIES' : 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9kZXYucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LIAM LAWSON' : 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/liam-lawson.png?im=Resize,width=270'
  };

  async ngOnInit() {
    await this.loadAllDrivers();
  }

  // Foto ufficiali ad alta risoluzione dei piloti della griglia attuale (chiave: nome completo in maiuscolo)
  private readonly currentPhotos = new Map<string, string>();

  private photoKey(driver: Driver): string {
    return (driver.full_name || `${driver.first_name} ${driver.last_name}`).toUpperCase().trim();
  }

  private async loadCurrentPhotos(): Promise<void> {
    try {
      for (const driver of await this.openF1Service.getLatestDrivers()) {
        const url = currentSeasonPhotoUrl(driver);
        if (url) this.currentPhotos.set(this.photoKey(driver), url);
      }
    } catch {
      // Senza griglia attuale usiamo le foto di OpenF1
    }
  }

  private isExcluded(driver: Driver): boolean {
    const name = (driver.full_name || '').toUpperCase();
    return this.excludedDrivers.has(name);
  }

  async loadAllDrivers() {
    this.loading = true;
    this.error = undefined;

    try {
      // Carica tutti i meeting disponibili
      const allMeetings = await this.openF1Service.getMeetings();
      await this.loadCurrentPhotos();

      // Raggruppa meeting per anno e prendi il primo meeting di ogni anno
      const yearMeetings = new Map<number, number[]>();
      allMeetings.forEach(meeting => {
        if (!yearMeetings.has(meeting.year)) {
          yearMeetings.set(meeting.year, []);
        }
        yearMeetings.get(meeting.year)!.push(meeting.meeting_key);
      });

      // Carica i piloti per ogni anno provando diversi meeting se necessario
      for (const [year, meetingKeys] of yearMeetings.entries()) {
        let driversLoaded = false;
        
        // Prova con i primi meeting dell'anno fino a trovare dati
        for (const meetingKey of meetingKeys.slice(0, 3)) {
          try {
            const driversOfYear = (await this.openF1Service.getDrivers(meetingKey, 'meeting'))
              .filter(driver => !this.isExcluded(driver));

            if (driversOfYear.length === 0) {
              continue; // Prova il prossimo meeting
            }

            // Deduplica per driver_number mantenendo l'entry con più info (es. team_color)
            const yearDriversMap = new Map<number, Driver>();
            driversOfYear.forEach(driver => {
              const existing = yearDriversMap.get(driver.driver_number);
              if (!existing || (driver.team_color && !existing.team_color)) {
                yearDriversMap.set(
                  driver.driver_number,
                  {
                    ...driver,
                    team_color: driver.team_color || this.teamColors[driver.team_name] || 'FFFFFF'
                  }
                );
              }
            });

            const processedDrivers = Array.from(yearDriversMap.values()).sort((a, b) => a.driver_number - b.driver_number);
            this.allDrivers.set(year, processedDrivers);
            driversLoaded = true;

            // Piccola pausa tra le richieste per evitare rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            break; // Trovati i piloti, passa all'anno successivo
          } catch (err) {
            // Prova il prossimo meeting
          }
        }
        
        if (!driversLoaded) {
          // Se non ci sono piloti per l'anno corrente, non aggiungere l'anno
        }
      }

      // Nessun pilota caricato perché l'API non risponde: mostriamo l'avviso
      if (this.allDrivers.size === 0 && this.openF1Service.apiStatus() === 'error') {
        throw new Error('API OpenF1 non disponibile');
      }

      // Popola gli anni disponibili
      this.populateYears();

      // Inizialmente mostra tutti i piloti senza anno selezionato
      this.applyFilters();
    } catch (err: any) {
      this.error = err?.message || 'Errore caricamento piloti';
    } finally {
      this.loading = false;
    }
  }

  private populateYears() {
    const sortedYears = Array.from(this.allDrivers.keys()).sort((a, b) => b - a);
    this.years = sortedYears.map(year => ({
      label: year.toString(),
      value: year
    }));
  }

  onYearSelect(year: number | null) {
    this.selectedYear = year;
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  resetFilters() {
    this.selectedYear = null;
    this.searchQuery = '';
    this.applyFilters();
  }

  private applyFilters() {
    let result: Driver[] = [];

    if (this.selectedYear) {
      // Mostra solo i piloti dell'anno selezionato con la scuderia
      const yearDrivers = this.allDrivers.get(this.selectedYear) || [];
      result = yearDrivers.map(driver => ({ ...driver }));
    } else {
      // Mostra tutti i piloti di tutti gli anni, senza duplicati per nome
      // (non per numero: un pilota può cambiarlo, es. Norris dal #4 al #1 da campione)
      const uniqueDriversMap = new Map<string, Driver>();

      // Itera tutti gli anni dal più recente al più vecchio, così resta il numero attuale
      const sortedYears = Array.from(this.allDrivers.keys()).sort((a, b) => b - a);

      for (const year of sortedYears) {
        const drivers = this.allDrivers.get(year) || [];
        for (const driver of drivers) {
          // Se il pilota non è ancora presente, aggiungilo
          const key = this.photoKey(driver);
          if (!uniqueDriversMap.has(key)) {
            uniqueDriversMap.set(key, {
              ...driver,
              team_name: '' // Nascondi la scuderia quando non c'è filtro anno
            });
          }
        }
      }

      result = Array.from(uniqueDriversMap.values()).sort((a, b) =>
        a.driver_number - b.driver_number
      );
    }

    // Applica ricerca se presente
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(driver =>
        driver.full_name.toLowerCase().includes(query) ||
        driver.broadcast_name.toLowerCase().includes(query) ||
        driver.name_acronym.toLowerCase().includes(query) ||
        driver.driver_number.toString().includes(query)
      );
    }

    this.filteredDrivers = result;
    this.drivers = result;
  }

  getDriverImage(driver: Driver): string {
    // 1. Foto ufficiale ad alta risoluzione della stagione in corso
    const current = this.currentPhotos.get(this.photoKey(driver));
    if (current) return current;

    // 2. Foto di OpenF1 in versione grande
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    if (headshot) return headshot;

    // 3. Foto inserite a mano, poi avatar con le iniziali
    return this.driverPhotos[`${driver.first_name} ${driver.last_name}`.toUpperCase().trim()] || this.avatarUrl(driver);
  }

  private avatarUrl(driver: Driver): string {
    const teamColor = this.getTeamColor(driver);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name_acronym)}&size=800&background=${teamColor}&color=ffffff&bold=true&font-size=0.33&format=svg`;
  }

  // Se la foto non si carica passa alla successiva disponibile
  onDriverImageError(event: Event, driver: Driver): void {
    const img = event.target as HTMLImageElement;
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    const avatar = this.avatarUrl(driver);
    if (headshot && img.src !== headshot) {
      img.src = headshot;
    } else if (img.src !== avatar) {
      img.src = avatar;
    }
  }

getTeamColor(driver: Driver): string {
  // Se non c'è anno selezionato, usa colore neutro
  if (!this.selectedYear) {
    return '555555'; // Grigio neutro
  }

  // Prova prima con team_color dall'API
  let color = driver.team_color ? driver.team_color.replace('#', '').toUpperCase() : null;

  // Se manca o è nero, usa il colore mappato
  if (!color || color === '000000' || color === '000') {
    color = driver.team_name ? (this.teamColors[driver.team_name] || '555555') : '555555';
  }

  return color;
}

getDriverImageWithTeamColor(driver: Driver): string {
  const teamColor = this.getTeamColor(driver).replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&size=800&background=${teamColor}&color=fff&bold=true&font-size=0.35&format=svg`;
}

// TrackBy per evitare duplicati nel rendering
// Arrow function: Angular chiama trackBy senza "this", così resta legata al componente
trackByDriverNumber = (index: number, driver: Driver): string =>
  this.photoKey(driver); // il nome, perché lo stesso numero può appartenere a piloti di anni diversi
}
