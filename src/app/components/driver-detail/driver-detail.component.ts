import { Component, OnInit, inject } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { currentSeasonPhotoUrl, hiResHeadshotUrl } from '../../utils/f1-media';
import { ApiUnavailableComponent } from '../api-unavailable/api-unavailable.component';
import { DriverCareerComponent } from '../driver-career/driver-career.component';
import { WikipediaBioComponent } from '../wikipedia-bio/wikipedia-bio.component';
import { nationalityToCountryCode } from '../../utils/nationality';
import { flagUrl } from '../../utils/country-flags';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, TagModule, ApiUnavailableComponent, DriverCareerComponent, WikipediaBioComponent],
  templateUrl: './driver-detail.component.html',
  styleUrls: ['./driver-detail.component.css']
})
export class DriverDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly openF1Service = inject(Openf1ServiceService);
  private readonly sanitizer = inject(DomSanitizer);

  driver: Driver | null = null;
  loading = true;
  error?: string;
  // URL della bandiera già caricata: finché non coincide con quella attuale si vede lo skeleton
  flagLoadedUrl?: string;
  // la sezione carriera cerca il pilota su Jolpica: da lì arrivano nazionalità (se OpenF1 non ha il paese)
  // e titolo Wikipedia (biografia con 2 richieste); finché non risponde bandiera e biografia aspettano
  matchPending = true;
  wikiTitle?: string;

  // Stessa mappa usata in drivers.component per coerenza immagini
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
    'ZHOU GUANYU': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS96aG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'GUANYU ZHOU': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS96aG8ucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'KEVIN MAGNUSSEN': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9tYWcucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'NICO HULKENBERG': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/nico-hulkenberg.png?im=Resize,width=270',
    'ALEXANDER ALBON': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9hbGIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LOGAN SARGEANT': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyNC9kcml2ZXJzL2hlYWRzaG90cy9mMS9zYXIucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'OLIVER BEARMAN': 'https://www.olliebearman.com/media/pages/home/b4d938add1-1740818186/about-home-1200x.webp',
    'FRANCO COLAPINTO': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/franco-colapinto.png?im=Resize,width=270',
    'ANDREA KIMI ANTONELLI': 'https://images.ctfassets.net/1fvlg6xqnm65/5YiTw6xQHuM94ty9yLDnyk/ff67d40c690940307f48d1b370352577/Kimi_Antonelli.png',
    'ISACK HADJAR': 'https://soymotor.com/sites/default/files/2025-03/ihadjar_2025.png',
    'NYCK DE VRIES': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9kZXYucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LIAM LAWSON': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/liam-lawson.png?im=Resize,width=270'
  };

  /** true se il problema è la connessione all'API, false se il pilota non esiste */
  get apiUnavailable(): boolean {
    return this.openF1Service.apiStatus() === 'error';
  }

  reload(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadDriverByIdOrAcronym(id);
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (!id) {
        this.error = 'Pilota non trovato';
        this.loading = false;
        return;
      }
      // Prova prima con acronimo, poi con numero
      await this.loadDriverByIdOrAcronym(id);
    });
  }

  private async loadDriverByIdOrAcronym(id: string) {
    this.loading = true;
    this.error = undefined;
    this.matchPending = true;
    this.wikiTitle = undefined;
    try {
      // Prima cerchiamo nella griglia attuale (pochi KB e già in cache dalla pagina Piloti);
      // solo per i piloti del passato serve la ricerca completa, molto più pesante
      const isNumber = /^\d+$/.test(id);
      const latest = await this.openF1Service.getLatestDrivers().catch(() => [] as Driver[]);
      this.driver = latest.find(d => isNumber
        ? d.driver_number === Number(id)
        : (d.name_acronym || '').toUpperCase() === id.toUpperCase()) ?? null;

      if (!this.driver) {
        this.driver = isNumber
          ? await this.openF1Service.getDriverByNumber(Number(id))
          : await this.openF1Service.getDriverByAcronym(id);
      }

      if (!this.driver) {
        this.error = 'Pilota non trovato';
      } else {
        // Aggiorna i dati del pilota con la stagione più recente disponibile
        await this.refreshDriverLatestSeason();
      }
    } catch (err: any) {
      this.error = err?.message || 'Errore durante il caricamento del pilota';
    } finally {
      this.loading = false;
    }
  }

  private async refreshDriverLatestSeason(): Promise<void> {
    try {
      if (!this.driver?.name_acronym) return;
      const acronym = this.driver.name_acronym.toUpperCase();
      this.currentPhoto = undefined;

      // Se il pilota è nella griglia attuale usiamo team, colore e foto ufficiale della stagione in corso
      const current = (await this.openF1Service.getLatestDrivers())
        .find(d => (d.name_acronym || '').toUpperCase() === acronym);
      if (current) {
        this.driver = {
          ...this.driver,
          team_name: current.team_name || this.driver.team_name,
          team_color: current.team_color || this.driver.team_color,
          driver_number: current.driver_number || this.driver.driver_number,
          headshot_url: current.headshot_url || this.driver.headshot_url
        };
        this.currentPhoto = currentSeasonPhotoUrl(current);
        return;
      }

      const nowYear = new Date().getFullYear();
      const yearsToTry = [nowYear, nowYear - 1];

      for (const y of yearsToTry) {
        const meetings = await this.openF1Service.getMeetings(y);
        if (!meetings || meetings.length === 0) continue;
        // Ordina per data di inizio desc e prendi l'ultima gara dell'anno
        const sorted = meetings
          .filter(m => !!m.date_start)
          .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());
        const latest = sorted[0];
        if (!latest) continue;
        const drivers = await this.openF1Service.getDrivers(latest.meeting_key, 'meeting');
        const match = drivers.find(d => (d.name_acronym || '').toUpperCase() === acronym || (d.full_name || '').toUpperCase() === (this.driver!.full_name || '').toUpperCase());
        if (match) {
          const before = { team: this.driver.team_name, number: this.driver.driver_number };
          this.driver = {
            ...this.driver,
            team_name: match.team_name || this.driver.team_name,
            team_color: match.team_color || this.driver.team_color,
            driver_number: match.driver_number || this.driver.driver_number
          };
          break;
        }
      }
    } catch (e) {
      // Silenzia errori di aggiornamento stagione corrente
    }
  }

  private readonly fallbackPhoto = 'https://static.vecteezy.com/system/resources/thumbnails/024/182/341/small_2x/f1-logo-symbol-red-and-black-design-f1-icon-vector.jpg';

  // Foto ufficiale ad alta risoluzione della stagione in corso (solo per i piloti in griglia)
  currentPhoto?: string;

  getDriverImage(driver: Driver | null): string {
    if (!driver) return this.fallbackPhoto;
    if (this.currentPhoto) return this.currentPhoto;

    const headshot = hiResHeadshotUrl(driver.headshot_url);
    if (headshot) return headshot;

    const key = (driver.full_name || driver.broadcast_name || '').trim().toUpperCase();
    return this.driverPhotos[key] || this.fallbackPhoto;
  }

  // Se la foto non si carica passa alla successiva disponibile
  onDriverImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const headshot = hiResHeadshotUrl(this.driver?.headshot_url);
    if (headshot && img.src !== headshot) {
      img.src = headshot;
    } else if (img.src !== this.fallbackPhoto) {
      img.src = this.fallbackPhoto;
    }
  }

  getInitialLast(driver: Driver | null): string {
    if (!driver) return '';
    const full = driver.full_name || driver.broadcast_name;
    if (!full) return '';
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    const first = parts.shift();
    const initial = first ? first.charAt(0).toUpperCase() + '.' : '';
    return `${initial} ${last}`.trim();
  }

  // Bandiera non disponibile: niente skeleton infinito, lo spazio resta vuoto
  onFlagError(event: Event, url: string): void {
    (event.target as HTMLImageElement).style.display = 'none';
    this.flagLoadedUrl = url;
  }

  getFlagUrl(driver: Driver | null): string {
    return flagUrl(driver?.country_code);
  }

  getHeroBackground(driver: Driver | null): SafeStyle {
    const flagUrl = this.getFlagUrl(driver);
    if (!flagUrl) {
      return this.sanitizer.bypassSecurityTrustStyle('linear-gradient(135deg,#111,#1c1c1c)');
    }
    const style = `linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.75)), url(${flagUrl})`;
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }

  get stats(): Array<{ label: string; value: string; accent?: string }> {
    if (!this.driver) return [];
    return [
      { label: 'Numero', value: `#${this.driver.driver_number}` },
      { label: 'Team', value: this.driver.team_name || 'Non confermato', accent: `#${this.driver.team_color || '666'}` },
      { label: 'Acronimo', value: this.driver.name_acronym || '—' },
      { label: 'Paese', value: this.driver.country_code || 'N/D' }
    ];
  }

  // Bandiera dalla nazionalità Jolpica quando OpenF1 non ha il paese del pilota
  onMatched(match: { nationality?: string; wikiTitle?: string } | null): void {
    this.matchPending = false;
    this.wikiTitle = match?.wikiTitle;
    if (!match?.nationality || !this.driver || this.driver.country_code) return;
    const code = nationalityToCountryCode(match.nationality);
    if (code) this.driver = { ...this.driver, country_code: code };
  }
}
