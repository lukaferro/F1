import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JolpicaService, HistoricRaceDetail, HistoricRaceResult, HistoricQualifyingResult } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { countryNameToCode, flagUrl } from '../../utils/country-flags';
import { constructorColor, constructorLogo, ConstructorLogo } from '../../utils/constructor-branding';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';

@Component({
  selector: 'app-historic-gran-premi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ApiUnavailableComponent],
  templateUrl: './historic-gran-premi-detail.component.html',
  styleUrl: './historic-gran-premi-detail.component.css'
})
export class HistoricGranPremiDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jolpica = inject(JolpicaService);
  private readonly wikipedia = inject(WikipediaService);

  season = 0;
  round = 0;
  raceDetail: HistoricRaceDetail | null = null;
  qualifyingResults: HistoricQualifyingResult[] = [];
  driverPhotos = new Map<string, string>();
  loading = true;
  error = false;
  notFound = false;
  selectedTab: 'results' | 'qualifying' = 'results';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const s = Number(params.get('season'));
      const r = Number(params.get('round'));
      if (s && r) {
        this.season = s;
        this.round = r;
        this.loadRace(s, r);
      }
    });
  }

  async loadRace(season: number, round: number): Promise<void> {
    this.loading = true;
    this.error = false;
    this.notFound = false;
    this.driverPhotos.clear();

    try {
      const [race, quali] = await Promise.all([
        this.jolpica.getRaceResults(season, round),
        this.jolpica.getRaceQualifying(season, round).catch(() => [])
      ]);

      if (!race) {
        this.notFound = true;
        this.raceDetail = null;
        this.qualifyingResults = [];
        return;
      }

      this.raceDetail = race;
      this.qualifyingResults = quali;

      // Carica foto Wikipedia dei primi 3 classificati (podio)
      const top3 = race.results.slice(0, 3);
      const titles = top3.map(r => r.wikiTitle).filter((t): t is string => !!t);
      if (titles.length) {
        try {
          const images = await this.wikipedia.getImages(titles);
          for (const [title, url] of images.entries()) {
            this.driverPhotos.set(title, url);
          }
        } catch {
          // In caso di errore Wikipedia, si usano le iniziali sul colore del team
        }
      }
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  retry(): void {
    if (this.season && this.round) {
      this.loadRace(this.season, this.round);
    }
  }

  // Ordine del podio visivo a schermo: secondo (sinistra), primo (centro, più alto), terzo (destra)
  get driverPodium(): HistoricRaceResult[] {
    if (!this.raceDetail || this.raceDetail.results.length === 0) return [];
    const [first, second, third] = this.raceDetail.results;
    const res: HistoricRaceResult[] = [];
    if (second) res.push(second);
    if (first) res.push(first);
    if (third) res.push(third);
    return res;
  }

  photoFor(result: HistoricRaceResult): string | undefined {
    return result.wikiTitle ? this.driverPhotos.get(result.wikiTitle) : undefined;
  }

  driverLink(driverId: string, code?: string): string[] {
    if (this.raceDetail && this.raceDetail.season >= 2023 && code) {
      return ['/drivers', code];
    }
    return ['/drivers', 'storico', driverId];
  }

  driverColor(constructorId: string): string {
    return constructorColor(constructorId);
  }

  driverLogo(constructorId: string): ConstructorLogo | undefined {
    return constructorLogo(constructorId);
  }

  countryFlag(country: string): string {
    const code = countryNameToCode(country);
    return flagUrl(code);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  posDiff(grid: number, pos: number): { diff: number; text: string; cls: string } | null {
    if (grid <= 0) return null;
    const d = grid - pos;
    if (d > 0) return { diff: d, text: `+${d}`, cls: 'pos-gain' };
    if (d < 0) return { diff: d, text: `${d}`, cls: 'pos-loss' };
    return { diff: 0, text: '=', cls: 'pos-equal' };
  }
}
