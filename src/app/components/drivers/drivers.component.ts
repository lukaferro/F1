import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';

interface FilterOption {
  name: string;
  code?: string;
  value?: number;
}

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, DropdownModule],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);
  
  drivers: Driver[] = [];
  allDrivers: Driver[] = [];
  loading = false;
  error?: string;
  
  teams: FilterOption[] = [];
  selectedTeam: string | null = null;
  
  // Colori predefiniti per i team
  teamColors: { [key: string]: string } = {
    'Red Bull Racing': 'FF1801',
    'Mercedes': '6CD3BF',
    'Ferrari': 'F91536',
    'McLaren': 'FF8700',
    'Aston Martin': '358C75',
    'Alpine': '2293D1',
    'AlphaTauri': '5E8FAA',
    'Alfa Romeo': 'C92D4B',
    'Haas F1 Team': 'FFFFFF',
    'Williams': '37BEDD',
    'RB': '6692FF',
    'Kick Sauber': 'C92D4B'
  };
  
  async ngOnInit() {
    await this.loadDrivers();
  }
  
  private async loadDrivers() {
    this.loading = true;
    this.error = undefined;
    
    try {
      // Carica i piloti dell'anno corrente (2024)
      const allMeetings = await this.openF1Service.getMeetings();
      const latestMeeting = Array.isArray(allMeetings) ? allMeetings[0] : null;

      const drivers = latestMeeting 
        ? await this.openF1Service.getDrivers(latestMeeting.meeting_key, 'meeting')
        : await this.openF1Service.getDrivers();
      
      // Rimuovi duplicati e mantieni solo le informazioni più complete
      const uniqueDrivers = new Map<number, Driver>();
      drivers.forEach(driver => {
        const existing = uniqueDrivers.get(driver.driver_number);
        if (!existing || (driver.team_color && !existing.team_color)) {
          uniqueDrivers.set(driver.driver_number, {
            ...driver,
            team_color: driver.team_color || this.teamColors[driver.team_name] || 'FFFFFF'
          });
        }
      });
      
      this.allDrivers = Array.from(uniqueDrivers.values()).sort((a, b) => 
        a.driver_number - b.driver_number
      );
      this.drivers = [...this.allDrivers];
      
      // Popola i filtri per team
      this.populateTeams();
    } catch (err: any) {
      console.error('Errore caricamento piloti:', err);
      this.error = err?.message || 'Errore caricamento piloti';
    } finally {
      this.loading = false;
    }
  }
  
  private populateTeams() {
    const teams = new Map<string, string>();
    this.allDrivers.forEach(d => {
      if (d.team_name) {
        teams.set(d.team_name, d.team_name);
      }
    });
    
    this.teams = Array.from(teams).map(([code, name]) => ({
      name,
      code
    })).sort((a, b) => a.name.localeCompare(b.name));
  }
  
  onTeamChange(team: string | null) {
    this.selectedTeam = team;
    this.applyFilters();
  }
  
  resetFilters() {
    this.selectedTeam = null;
    this.drivers = [...this.allDrivers];
  }
  
  private applyFilters() {
    if (this.selectedTeam) {
      this.drivers = this.allDrivers.filter(d => d.team_name === this.selectedTeam);
    } else {
      this.drivers = [...this.allDrivers];
    }
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
    return driver.team_color || this.teamColors[driver.team_name] || 'FFFFFF';
  }
  
  getCountryFlag(countryCode: string): string {
    return countryCode.toLowerCase();
  }
  
  getDriverImageWithTeamColor(driver: Driver): string {
    const teamColor = this.getTeamColor(driver).replace('#', '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&size=800&background=${teamColor}&color=fff&bold=true&font-size=0.35&format=svg`;
  }
}
