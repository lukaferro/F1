import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';

interface YearOption {
  label: string;
  value: number | null;
}

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, DropdownModule, InputTextModule],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);
  
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
    'Kick Sauber': '01C00E'
  };
  
  async ngOnInit() {
    await this.loadAllDrivers();
  }
  
  private async loadAllDrivers() {
    this.loading = true;
    this.error = undefined;
    
    try {
      // Carica tutti i meeting disponibili
      const allMeetings = await this.openF1Service.getMeetings();
      
      // Raggruppa meeting per anno e prendi solo il primo meeting di ogni anno
      const yearFirstMeeting = new Map<number, number>();
      allMeetings.forEach(meeting => {
        if (!yearFirstMeeting.has(meeting.year)) {
          yearFirstMeeting.set(meeting.year, meeting.meeting_key);
        }
      });
      
      // Carica i piloti per ogni anno (solo dal primo meeting) e rimuovi duplicati per numero
      for (const [year, meetingKey] of yearFirstMeeting.entries()) {
        try {
          const driversOfYear = await this.openF1Service.getDrivers(meetingKey, 'meeting');

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

          // Piccola pausa tra le richieste per evitare rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.warn(`Errore caricamento piloti per anno ${year}:`, err);
        }
      }
      
      // Popola gli anni disponibili
      this.populateYears();
      
      // Inizialmente mostra tutti i piloti senza anno selezionato
      this.applyFilters();
    } catch (err: any) {
      console.error('Errore caricamento piloti:', err);
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
      // Mostra tutti i piloti di tutti gli anni, senza duplicati per numero
      const uniqueDriversMap = new Map<number, Driver>();
      
      // Itera tutti gli anni dal più recente al più vecchio
      const sortedYears = Array.from(this.allDrivers.keys()).sort((a, b) => b - a);
      
      for (const year of sortedYears) {
        const drivers = this.allDrivers.get(year) || [];
        for (const driver of drivers) {
          // Se il pilota non è ancora presente, aggiungilo
          if (!uniqueDriversMap.has(driver.driver_number)) {
            uniqueDriversMap.set(driver.driver_number, {
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
    // Usa l'immagine dall'API se disponibile
    if ((driver as any).headshot_url) {
      return (driver as any).headshot_url;
    }
    // Immagine placeholder con iniziali
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&size=400&background=1e1e1e&color=fff&bold=true&font-size=0.4`;
  }
  
  getTeamColor(driver: Driver): string {
    // Se non c'è anno selezionato, usa colore neutro
    if (!this.selectedYear) {
      return '555555'; // Grigio neutro
    }
    let color = (driver.team_color || this.teamColors[driver.team_name] || 'FFFFFF').replace('#','').toUpperCase();
    // Evita colori totalmente neri dall'API che causano blocchi scuri
    if (color === '000000' || color === '000') {
      color = (this.teamColors[driver.team_name] || 'FFFFFF').toUpperCase();
    }
    return color;
  }
  
  getCountryFlag(countryCode: string): string {
    return countryCode ? countryCode.toLowerCase() : 'xx';
  }
  
  getDriverImageWithTeamColor(driver: Driver): string {
    const teamColor = this.getTeamColor(driver).replace('#', '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&size=800&background=${teamColor}&color=fff&bold=true&font-size=0.35&format=svg`;
  }
  
  // TrackBy per evitare duplicati nel rendering
  trackByDriverNumber(index: number, driver: Driver): number {
    return driver.driver_number;
  }
  
  // Determina se il testo deve essere nero o bianco in base al colore di sfondo
  getTextColor(driver: Driver): string {
    const color = this.getTeamColor(driver);
    // Converti hex in RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Calcola luminosità
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // Se il colore è chiaro, usa testo nero, altrimenti bianco
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }
}
