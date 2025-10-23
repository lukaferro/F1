import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { Meeting } from '../../models/meeting';
import { Openf1ServiceService } from '../../services/openf1-service';

@Component({
  selector: 'app-gran-premi',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule],
  templateUrl: './gran-premi.component.html',
  styleUrls: ['./gran-premi.component.css']
})
export class GranPremiComponent implements OnInit {
  private readonly openF1Service = inject(Openf1ServiceService);

  years: Array<{ name: string; value: number }> = [];

  selectedYear: number | null = null;

  meetings: Meeting[] = [];
  loading = false;
  error?: string;

  async ngOnInit() {
    this.loadYears();
    await this.loadMeetings(undefined);
  }

  async onYearChange(payload: number | null) {
    this.selectedYear = typeof payload === 'number' ? payload : null;
    await this.loadMeetings(this.selectedYear);
  }

  async clearSelection() {
    this.selectedYear = null;
    await this.loadMeetings(undefined);
  }

  private async loadMeetings(year?: number | null) {
    this.loading = true;
    this.error = undefined;

    const param = typeof year === 'number' ? year : undefined;

    try {
      const resp = await this.openF1Service.getMeetings(param);
      let meetings: Meeting[] = [];

      if (Array.isArray(resp)) {
        meetings = resp;
      } else if (resp && Array.isArray((resp as any).data)) {
        meetings = (resp as any).data;
      }

      if (!param) {
        meetings.sort((a, b) => {
          const dateA = new Date(a.date_start).getTime();
          const dateB = new Date(b.date_start).getTime();
          return dateB - dateA;
        });
      }

      this.meetings = meetings;
    } catch (err: any) {
      console.error('Errore loadMeetings', err);
      this.meetings = [];
      this.error = err?.message || 'Errore caricamento meeting';
    } finally {
      this.loading = false;
    }
  }

  trackById(_: number, item: Meeting) {
    return item?.meeting_key ?? item?.id ?? _;
  }

  loadYears(startYear = 2023) {
    const currentYear = new Date().getFullYear();
    this.years = [];
    let y = currentYear;
    while (y >= startYear) {
      this.years.push({
        name: String(y),
        value: y
      });
      y--;
    }
  }
}