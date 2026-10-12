import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';

import { JolpicaDriverInfo, JolpicaService } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { constructorColor } from '../../utils/constructor-branding';
import { flagUrl } from '../../utils/country-flags';
import { nationalityToCountryCode } from '../../utils/nationality';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { DriverCareerComponent } from '../driver-career/driver-career.component';
import { WikipediaBioComponent } from '../wikipedia-bio/wikipedia-bio.component';

// Dettaglio dei piloti di tutta la storia della F1 (archivio Jolpica + Wikipedia);
// i piloti dal 2023 hanno la pagina con i dati OpenF1 (/drivers/<sigla>)
@Component({
  selector: 'app-historic-driver-detail',
  standalone: true,
  imports: [RouterLink, ButtonModule, ApiUnavailableComponent, DriverCareerComponent, WikipediaBioComponent],
  templateUrl: './historic-driver-detail.component.html',
  // stesso aspetto del dettaglio dei piloti attuali
  styleUrls: ['../driver-detail/driver-detail.component.css', './historic-driver-detail.component.css']
})
export class HistoricDriverDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly jolpica = inject(JolpicaService);
  private readonly wikipedia = inject(WikipediaService);

  driver: JolpicaDriverInfo | null = null;
  loading = true;
  notFound = false;
  error = false;
  photo?: string;
  seasonsLabel?: string;
  lastTeam?: { id: string; name: string };
  flagLoadedUrl?: string;

  private driverId = '';
  private loadSeq = 0;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe(params => {
      this.driverId = params.get('driverId') ?? '';
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async load(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.notFound = false;
    this.error = false;
    this.driver = null;
    this.photo = undefined;
    this.seasonsLabel = undefined;
    this.lastTeam = undefined;
    try {
      const driver = await this.jolpica.getDriver(this.driverId);
      if (seq !== this.loadSeq) return;
      if (!driver) {
        this.notFound = true;
        return;
      }
      this.driver = driver;
      // foto e stagioni sono un di più: se mancano restano le iniziali e i campi vuoti
      this.loadPhoto(driver, seq);
      this.loadSeasons(driver.driverId, seq);
    } catch (err) {
      if (seq !== this.loadSeq) return;
      if (err instanceof HttpErrorResponse && err.status === 404) this.notFound = true;
      else this.error = true;
    } finally {
      if (seq === this.loadSeq) this.loading = false;
    }
  }

  private async loadPhoto(driver: JolpicaDriverInfo, seq: number): Promise<void> {
    if (!driver.wikiTitle) return;
    const images = await this.wikipedia.getImages([driver.wikiTitle]);
    if (seq === this.loadSeq) this.photo = images.get(driver.wikiTitle);
  }

  private async loadSeasons(driverId: string, seq: number): Promise<void> {
    try {
      const seasons = await this.jolpica.getDriverSeasons(driverId);
      if (seq !== this.loadSeq || !seasons.length) return;
      const first = Math.min(...seasons);
      const last = Math.max(...seasons);
      this.seasonsLabel = first === last ? String(first) : `${first}–${last}`;
      // stessa richiesta della sezione carriera: arriva dalla cache
      const standing = (await this.jolpica.getDriverStandings(last)).find(s => s.driverId === driverId);
      if (seq !== this.loadSeq) return;
      this.lastTeam = standing?.constructors[standing.constructors.length - 1];
    } catch {
      // senza stagioni il pannello mostra solo l'anagrafica
    }
  }

  get flag(): string {
    return flagUrl(this.driver?.nationality ? nationalityToCountryCode(this.driver.nationality) : undefined);
  }

  /** Colore dell'ultima squadra, per il riquadro con le iniziali */
  get teamColor(): string {
    return `#${constructorColor(this.lastTeam?.id ?? '')}`;
  }

  get initials(): string {
    return this.driver ? `${this.driver.givenName.charAt(0)}${this.driver.familyName.charAt(0)}`.toUpperCase() : '';
  }

  get birthDate(): string | undefined {
    if (!this.driver?.dateOfBirth) return undefined;
    return new Date(this.driver.dateOfBirth).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  get infoCards(): Array<{ label: string; value: string }> {
    if (!this.driver) return [];
    return [
      { label: 'Nazionalità', value: this.driver.nationality ?? '—' },
      { label: 'Data di nascita', value: this.birthDate ?? '—' },
      ...(this.driver.permanentNumber ? [{ label: 'Numero', value: `#${this.driver.permanentNumber}` }] : []),
      { label: 'Stagioni', value: this.seasonsLabel ?? '—' },
      { label: 'Ultima scuderia', value: this.lastTeam?.name ?? '—' }
    ];
  }

  // bandiera non disponibile: niente skeleton infinito
  onFlagError(event: Event, url: string): void {
    (event.target as HTMLImageElement).style.display = 'none';
    this.flagLoadedUrl = url;
  }

  // foto non caricabile: si passa alle iniziali
  onPhotoError(): void {
    this.photo = undefined;
  }
}
