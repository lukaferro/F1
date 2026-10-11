import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';
import { currentSeasonPhotoUrl, hiResHeadshotUrl } from '../../utils/f1-media';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, TagModule],
  templateUrl: './driver-detail.component.html',
  styleUrls: ['./driver-detail.component.css']
})
export class DriverDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly openF1Service = inject(Openf1ServiceService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);

  driver: Driver | null = null;
  loading = true;
  error?: string;
  wikiExtract = '';
  wikiUrl = '';
  loadingWiki = false;
  careerStats: any = null;
  loadingStats = false;

  // Mappatura codici paese come in gran-premi-detail (3 lettere -> ISO2)
  private readonly countryCodeMapping: Record<string, string> = {
    BRN: 'bh',
    KSA: 'sa',
    AUS: 'au',
    JPN: 'jp',
    CHN: 'cn',
    USA: 'us',
    ITA: 'it',
    MON: 'mc',
    CAN: 'ca',
    ESP: 'es',
    AUT: 'at',
    GBR: 'gb',
    HUN: 'hu',
    BEL: 'be',
    NED: 'nl',
    AZE: 'az',
    SGP: 'sg',
    MEX: 'mx',
    BRA: 'br',
    UAE: 'ae',
    QAT: 'qa',
    FRA: 'fr',
    DEU: 'de',
    GER: 'de',
    RUS: 'ru',
    PRT: 'pt',
    TUR: 'tr',
    MYS: 'my',
    JOR: 'jo',
    KOR: 'kr',
    IND: 'in',
    ZAF: 'za',
    ABU: 'ae',
    ARG: 'ar',
    BAH: 'bh',
    SIN: 'sg',
    JAP: 'jp',
    MAL: 'my',
    EUR: 'eu',
    STY: 'at',
    EMI: 'it',
    TUS: 'it',
    POR: 'pt',
    LUX: 'lu',
    MIA: 'us',
    LAS: 'us',
    TEX: 'us',
    CAT: 'es',
    SPA: 'be',
    EIF: 'de',
    MUG: 'it',
    AZB: 'az',
    DEN: 'dk',  // Danimarca
    DNK: 'dk',  // Danimarca (alternativo)
    FIN: 'fi',  // Finlandia
    THA: 'th',  // Tailandia
    NZL: 'nz',  // Nuova Zelanda
    POL: 'pl',  // Polonia
    SWE: 'se',  // Svezia
    CHE: 'ch',  // Svizzera
    SUI: 'ch',  // Svizzera (alternativo)
    NOR: 'no',  // Norvegia
    CZE: 'cz',  // Repubblica Ceca
    VEN: 've',  // Venezuela
    COL: 'co'   // Colombia
  };

  // Nomi alternativi per ricerca Wikipedia (alcuni piloti hanno nomi diversi su Wikipedia)
  private readonly wikiNameVariants: Record<string, string[]> = {
    'ISACK HADJAR': ['Isack Hadjar', 'Isack Hadjar (racing driver)'],
    'ANDREA KIMI ANTONELLI': ['Andrea Kimi Antonelli', 'Kimi Antonelli', 'Andrea Antonelli'],
    'LIAM LAWSON': ['Liam Lawson', 'Liam Lawson (racing driver)'],
    'OLIVER BEARMAN': ['Oliver Bearman', 'Ollie Bearman'],
    'FRANCO COLAPINTO': ['Franco Colapinto'],
    'YUKI TSUNODA': ['Yuki Tsunoda'],
    'ESTEBAN OCON': ['Esteban Ocon']
  };

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
        // Carica info Wikipedia in background
        this.loadWikipediaInfo(this.driver.full_name);
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

  getFlagUrl(driver: Driver | null): string {
    if (!driver || !driver.country_code) return '';
    const iso2 = this.countryCodeMapping[driver.country_code] || driver.country_code.toLowerCase();
    return `https://flagcdn.com/w320/${iso2}.png`;
  }

  getHeroBackground(driver: Driver | null): SafeStyle {
    const flagUrl = this.getFlagUrl(driver);
    if (!flagUrl) {
      return this.sanitizer.bypassSecurityTrustStyle('linear-gradient(135deg,#111,#1c1c1c)');
    }
    const style = `linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.75)), url(${flagUrl})`;
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }

  private async loadWikipediaInfo(fullName: string) {
    if (!fullName) return;
    this.loadingWiki = true;
    this.loadingStats = true;
    
    // Ottieni varianti nome da cercare
    const nameKey = fullName.toUpperCase();
    const wikiNameVariants: Record<string, string[]> = {
      'ISACK HADJAR': ['Isack Hadjar', 'Isack Hadjar (racing driver)'],
      'ANDREA KIMI ANTONELLI': ['Andrea Kimi Antonelli', 'Kimi Antonelli', 'Andrea Antonelli'],
      'LIAM LAWSON': ['Liam Lawson', 'Liam Lawson (racing driver)'],
      'OLIVER BEARMAN': ['Oliver Bearman', 'Ollie Bearman'],
      'FRANCO COLAPINTO': ['Franco Colapinto'],
      'YUKI TSUNODA': ['Yuki Tsunoda'],
      'ESTEBAN OCON': ['Esteban Ocon']
    };
    const namesToTry = wikiNameVariants[nameKey] || [fullName];
    const locales = ['it', 'en'];

    try {
      // Prova tutte le combinazioni di locale e variante nome
      for (const locale of locales) {
        for (const searchName of namesToTry) {
          const searchUrl = `https://${locale}.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(searchName)}`;
          const searchResult: any = await this.http.get(searchUrl).toPromise();
          if (!searchResult?.query?.search?.length) continue;

          const pageTitle = searchResult.query.search[0].title;
          this.wikiUrl = `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

          const extractUrl = `https://${locale}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}`;
          const extractResult: any = await this.http.get(extractUrl).toPromise();
          if (extractResult?.query?.pages) {
            const pages = extractResult.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pages[pageId]?.extract) {
              this.wikiExtract = pages[pageId].extract;
            }
          }

          // Prova a estrarre statistiche dalla tabella HTML (Carriera F1)
          await this.loadWikipediaStats(pageTitle, locale);

          // Se abbiamo ottenuto qualcosa con questa variante, interrompiamo
          if (this.wikiExtract || this.careerStats) {
            break;
          }
        }
        // Se abbiamo trovato dati, esci dal loop locale
        if (this.wikiExtract || this.careerStats) {
          break;
        }
      }
      
      // Se non trova nulla, imposta stringa vuota
      if (!this.wikiExtract) {
        this.wikiExtract = '';
      }
    } catch (err) {
      // Silenzia errori caricamento Wikipedia
    } finally {
      this.loadingWiki = false;
      this.loadingStats = false;
    }
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

  private cleanWikiValue(value: string): string {
    return value
      .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1') // [[Testo|Label]] -> Label
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[Testo]] -> Testo
      .replace(/<[^>]+>/g, '') // rimuovi HTML
      .replace(/\{\{[^}]+\}\}/g, '') // rimuovi template
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeLabel(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // rimuovi accenti diacritici
      .replace(/[^a-z0-9 ]/g, '') // tieni solo lettere, numeri, spazi
      .replace(/\s+/g, ' ') // collassa spazi multipli
      .trim();
  }

  private async loadWikipediaStats(pageTitle: string, locale: string) {
    const stats = await this.parseWikipediaHtmlStats(pageTitle, locale);
    if (stats) {
      this.careerStats = {
        ...(this.careerStats || {}),
        debut: stats.debut || this.careerStats?.debut || '—',
        races: stats.races || this.careerStats?.races || '—',
        wins: stats.wins || this.careerStats?.wins || '—',
        podiums: stats.podiums || this.careerStats?.podiums || '—',
        poles: stats.poles || this.careerStats?.poles || '—',
        fastestLaps: stats.fastestLaps || this.careerStats?.fastestLaps || '—',
        points: stats.points || this.careerStats?.points || '—',
        championshipsCount: stats.championshipsCount || this.careerStats?.championshipsCount || '0',
        championshipYears: stats.championshipYears || this.careerStats?.championshipYears || [],
        teams: stats.teams || this.careerStats?.teams || '—',
        teamsArray: stats.teamsArray || this.careerStats?.teamsArray || []
      };
      
      // Se OpenF1 non ha country_code, prova a prenderlo da Wikipedia
      if (stats.country && this.driver && !this.driver.country_code) {
        // Cerca di estrarre codice ISO se presente
        this.driver = { ...this.driver, country_code: this.extractCountryCode(stats.country) };
      }
    }
  }

  // Parsing HTML della pagina Wikipedia (action=parse) per estrarre le righe chiave della tabella carriera
  private async parseWikipediaHtmlStats(pageTitle: string, locale: string): Promise<{ wins?: string; podiums?: string; poles?: string; fastestLaps?: string; championships?: string; teams?: string; debut?: string; races?: string; points?: string; championshipsCount?: string; championshipYears?: string[]; teamsArray?: string[]; country?: string } | null> {
    try {
      const parseUrl = `https://${locale}.wikipedia.org/w/api.php?action=parse&origin=*&format=json&page=${encodeURIComponent(pageTitle)}&prop=text`;
      const htmlRes: any = await this.http.get(parseUrl).toPromise();
      const html: string | undefined = htmlRes?.parse?.text?.['*'];
      if (!html) return null;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('table.infobox tr, table.wikitable tr'));
      
      

      // Marcatori per riconoscere il contesto Formula 1 ed escludere altre serie
      const f1Markers = [
        'formula 1', 'formula one', 'formula uno',
        'campionato mondiale di formula 1', 'statistiche in f1', 'carriera in f1',
        'formula one world championship', 'career statistics formula one'
      ];
      const nonF1Markers = [
        'indy', 'indycar', 'indianapolis 500', 'indy 500', '500 miglia', '500 miglia di indianapolis',
        'gp2', 'formula 2', 'f2', 'formula 3', 'f3',
        'dtm', 'wec', 'fia wec', 'fia world endurance', 'world endurance', 'elms', 'wrc', 'formula e', 'super formula', 'karting', 'endurance', 'daytona',
        'le mans', '24 ore di le mans', 'andretti', 'gazoo'
      ];

      const norm = (t: string) => this.normalizeLabel(t);
      const textHasAny = (t: string | null | undefined, markers: string[]) => {
        const n = norm(t || '');
        return markers.some(m => n.includes(norm(m)));
      };

      // Verifica se la riga appartiene ad un contesto F1 usando caption e heading vicine
      const isRowInF1Context = (rowEl: Element): boolean => {
        const table = rowEl.closest('table');
        if (!table) return false;

        // Fallback: le righe dell'infobox sono considerate F1
        const isInfobox = (table.classList.contains('infobox') ||
          (table.getAttribute('class') || '').toLowerCase().includes('infobox'));
        if (isInfobox) return true;

        const isWikitable = (table.classList.contains('wikitable') ||
          (table.getAttribute('class') || '').toLowerCase().includes('wikitable'));

        const texts: string[] = [];
        const caption = table.querySelector('caption');
        if (caption) texts.push(caption.textContent || '');

        // Considera anche tutti i th della tabella come contesto
        const ths = Array.from(table.querySelectorAll('th'));
        ths.forEach(th => texts.push(th.textContent || ''));

        // Cerca heading (h2/h3/h4) immediatamente precedente nella gerarchia
        const scanPrevForHeading = (el: Element | null, maxSteps = 12): void => {
          let cur: Element | null = el;
          let steps = 0;
          while (cur && steps < maxSteps) {
            const prev = cur.previousElementSibling as Element | null;
            if (!prev) break;
            const tag = (prev.tagName || '').toLowerCase();
            if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
              texts.push(prev.textContent || '');
              break;
            }
            cur = prev;
            steps++;
          }
        };

        scanPrevForHeading(table as Element);
        // Tenta anche sui genitori per catturare heading di sezione
        const parent = table.parentElement as Element | null;
        if (parent) scanPrevForHeading(parent);

        // Se il contesto contiene marker non-F1, scarta
        if (texts.some(t => textHasAny(t, nonF1Markers))) return false;
        // Se troviamo marker F1, accetta
        if (texts.some(t => textHasAny(t, f1Markers))) return true;
        // Per le wikitable senza marker F1, non accettare
        if (isWikitable) return false;
        // Altrimenti, fallback (non dovrebbe capitare poiché gestiamo infobox e wikitable)
        return false;
      };

      const wanted: Record<'championships' | 'wins' | 'podiums' | 'poles' | 'fastestLaps' | 'teams' | 'debut' | 'races' | 'points' | 'country', readonly string[]> = {
        championships: ['mondiali vinti', 'campionati', 'campionati mondiali', 'world championships', 'titoli', 'world champion', 'f1 championships', 'world drivers championship', 'wdc'],
        wins: ['gp vinti', 'vittorie', 'wins', 'race wins', 'grand prix wins'],
        podiums: ['podi', 'podiums', 'podium finishes'],
        poles: ['pole position', 'pole positions', 'pole', 'poles'],
        fastestLaps: ['giri veloci', 'giro veloce', 'fastest laps', 'fastest lap'],
        teams: ['scuderie', 'teams', 'squadre', 'racing teams', 'team'],
        debut: ['esordio', 'debut', 'debutto', 'first race', 'formula one debut'],
        races: ['gp disputati', 'gare', 'races', 'gran premi', 'formula one entries', 'entries', 'starts', 'f1 starts', 'grand prix starts'],
        points: ['punti', 'points', 'punti ottenuti', 'career points', 'formula one points'],
        country: ['nazionalita', 'nationality', 'paese', 'country']
      };
      const extractNumber = (text: string, allowDecimal = false): string => {
        const match = text.match(/[0-9][0-9\s\.,]*/);
        if (!match) return text;
        let s = match[0].replace(/\s/g, '');
        if (allowDecimal) {
          s = s.replace(/,/g, '.').replace(/[^0-9.]/g, '');
          const firstDot = s.indexOf('.');
          if (firstDot !== -1) {
            s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
          }
        } else {
          s = s.replace(/[^0-9]/g, '');
        }
        return s;
      };

      const found: any = {};

      rows.forEach(row => {
        // Richiede contesto F1 (infobox accettato come fallback, altre tabelle devono avere marker F1)
        if (!isRowInF1Context(row)) {
          return;
        }
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (!th || !td) return;
        const label = this.normalizeLabel(th.textContent || '');
        const valueRaw = this.cleanWikiValue(td.innerHTML || td.textContent || '');

        // Salta subito righe che contengono marcatori espliciti di serie non-F1
        const rawLabel = th.textContent || '';
        const rawValue = td.textContent || '';
        const containsNonF1 = textHasAny(rawLabel, nonF1Markers) || textHasAny(rawValue, nonF1Markers);
        if (containsNonF1) {
          return;
        }

        (Object.entries(wanted) as Array<[keyof typeof wanted, readonly string[]]>).forEach(([key, labels]) => {
          labels.forEach(lab => {
            if (label.includes(this.normalizeLabel(lab))) {
              if (key === 'teams') {
                // Split quando troviamo pattern: "anno-anno Nome" o "anno- Nome"
                // Es: "Toro Rosso 2015-2016 Red Bull 2016-" -> ["Toro Rosso 2015-2016", "Red Bull 2016-"]
                let teamsArray = valueRaw
                  .replace(/(\d{4}(?:-\d{4})?-?)\s+([A-Z])/g, '$1|||$2') // Inserisci separatore tra anno e nome maiuscolo
                  .split('|||')
                  .map(v => v.trim())
                  .filter(Boolean)
                  .map(team => this.formatTeamEntry(team));
                // Filtra fuori riferimenti espliciti a serie non-F1
                teamsArray = teamsArray.filter(entry => !textHasAny(entry, nonF1Markers));
                
                found['teamsArray'] = teamsArray;
                found[key] = teamsArray.join(' • ');
              } else if (key === 'championships') {
                // Estrai anni dai titoli: "4 (2021, 2022, 2023, 2024)" -> count: 4, years: [2021, 2022, 2023, 2024]
                const match = valueRaw.match(/(\d+)(?:\s*\(([^)]+)\))?/);
                if (match) {
                  found['championshipsCount'] = match[1];
                  found['championshipYears'] = match[2] ? match[2].split(',').map(y => y.trim()) : [];
                }
              } else if (key === 'debut') {
                // Pulisci esordio: rimuovi br e newline per avere tutto su una riga
                found[key] = valueRaw
                  .replace(/<br\s*\/?>/gi, ' ')
                  .replace(/\n/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              } else if (key === 'country') {
                // Estrai codice paese, cerca pattern come "Regno Unito", "GBR", etc.
                found[key] = valueRaw.trim();
              } else if (key === 'wins' || key === 'podiums' || key === 'poles' || key === 'races' || key === 'points' || key === 'fastestLaps') {
                // Estrai il primo numero presente nel valore
                const num = extractNumber(valueRaw);
                found[key] = num;
              } else {
                found[key] = valueRaw;
              }
            }
          });
        });
      });

      if (Object.keys(found).length === 0) return null;
      return found;
    } catch (err) {
      // Silenzia errori di parsing Wikipedia
      return null;
    }
  }

  // Debug: mostra i primi 400 caratteri del wikitext della pagina per capire i campi disponibili
  private extractCountryCode(countryText: string): string {
    // Mappa nomi paese comuni a codici ISO
    const countryMap: Record<string, string> = {
      'regno unito': 'GBR',
      'united kingdom': 'GBR',
      'gran bretagna': 'GBR',
      'great britain': 'GBR',
      'italia': 'ITA',
      'italy': 'ITA',
      'francia': 'FRA',
      'france': 'FRA',
      'spagna': 'ESP',
      'spain': 'ESP',
      'germania': 'DEU',
      'germany': 'DEU',
      'olanda': 'NED',
      'paesi bassi': 'NED',
      'netherlands': 'NED',
      'belgio': 'BEL',
      'belgium': 'BEL',
      'australia': 'AUS',
      'giappone': 'JPN',
      'japan': 'JPN',
      'messico': 'MEX',
      'mexico': 'MEX',
      'canada': 'CAN',
      'brasile': 'BRA',
      'brazil': 'BRA',
      'argentina': 'ARG',
      'finlandia': 'FIN',
      'finland': 'FIN',
      'monaco': 'MON',
      'danimarca': 'DEN',
      'denmark': 'DEN',
      'thailandia': 'THA',
      'thailand': 'THA',
      'cina': 'CHN',
      'china': 'CHN',
      'stati uniti': 'USA',
      'united states': 'USA',
      'nuova zelanda': 'NZL',
      'new zealand': 'NZL'
    };
    
    const normalized = countryText.toLowerCase().trim();
    return countryMap[normalized] || countryText.toUpperCase().slice(0, 3);
  }

  private formatTeamEntry(teamStr: string): string {
    // Converte "Toro Rosso 2015-2016" -> "Toro Rosso (2015-2016)"
    // o "Red Bull 2016-" -> "Red Bull (2016-)"
    const match = teamStr.match(/^(.*?)\s+(\d{4}(?:-\d{4})?(?:-)?)$/);
    if (match) {
      return `${match[1].trim()} (${match[2]})`;
    }
    return teamStr.trim();
  }

  // rimosso logging wikitext per prestazioni
}
