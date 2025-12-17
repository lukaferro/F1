import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Openf1ServiceService, Driver } from '../../services/openf1-service';

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
    'GABRIEL BORTOLETO': ['Gabriel Bortoleto', 'Gabriel Bortoletto'],
    'ISACK HADJAR': ['Isack Hadjar', 'Isack Hadjar (racing driver)'],
    'JACK DOOHAN': ['Jack Doohan', 'Jack Doohan (racing driver)'],
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
    'LEWIS HAMILTON': 'https://www.autoformulastore.com/cdn/shop/collections/AF_FEED_INSTA_15.png?v=1743169809&width=1500',
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
    'GABRIEL BORTOLETO': 'https://www.autoformulastore.com/cdn/shop/collections/bortoleto.png?v=1743170302',
    'ISACK HADJAR': 'https://soymotor.com/sites/default/files/2025-03/ihadjar_2025.png',
    'JACK DOOHAN': 'https://cdn.racingnews365.com/_570x570_crop_center-center_none/jacdoo01.png?v=1741600637',
    'NYCK DE VRIES': 'https://image-service.zaonce.net/eyJidWNrZXQiOiJmcm9udGllci1jbXMiLCJrZXkiOiJmMW1hbmFnZXIvMjAyMy9kcml2ZXJzL2hlYWRzaG90cy9mMS9kZXYucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo1MDB9fX0=',
    'LIAM LAWSON': 'https://static.sky.it/images/skysport/it/motori/formula-1/piloti/liam-lawson.png?im=Resize,width=270'
  };

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      console.log('[Route] Driver ID from URL:', id);
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
      // Se è un numero, cerca per numero (legacy), altrimenti per acronimo
      const isNumber = /^\d+$/.test(id);
      if (isNumber) {
        this.driver = await this.openF1Service.getDriverByNumber(Number(id));
      } else {
        this.driver = await this.openF1Service.getDriverByAcronym(id);
      }
      
      if (!this.driver) {
        this.error = 'Pilota non trovato';
      } else {
        // Log per debug: mostra tutti i dati del pilota
        console.log('[Driver] Dati OpenF1:', {
          full_name: this.driver.full_name,
          name_acronym: this.driver.name_acronym,
          team_name: this.driver.team_name,
          team_color: this.driver.team_color,
          country_code: this.driver.country_code,
          driver_number: this.driver.driver_number,
          headshot_url: this.driver.headshot_url
        });
        // Carica info Wikipedia in background
        this.loadWikipediaInfo(this.driver.full_name);
      }
    } catch (err: any) {
      this.error = err?.message || 'Errore durante il caricamento del pilota';
    } finally {
      this.loading = false;
    }
  }

  getDriverImage(driver: Driver | null): string {
    const fallback = 'https://static.vecteezy.com/system/resources/thumbnails/024/182/341/small_2x/f1-logo-symbol-red-and-black-design-f1-icon-vector.jpg';
    if (!driver) return fallback;

    const key = (driver.full_name || driver.broadcast_name || '').trim().toUpperCase();
    if (key && this.driverPhotos[key]) {
      return this.driverPhotos[key];
    }

    return driver.headshot_url || fallback;
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
      'GABRIEL BORTOLETO': ['Gabriel Bortoleto', 'Gabriel Bortoletto'],
      'ISACK HADJAR': ['Isack Hadjar', 'Isack Hadjar (racing driver)'],
      'JACK DOOHAN': ['Jack Doohan', 'Jack Doohan (racing driver)'],
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
          console.log(`[Wiki] locale: ${locale}, searching: "${searchName}"`, searchResult);
          if (!searchResult?.query?.search?.length) continue;

          const pageTitle = searchResult.query.search[0].title;
          this.wikiUrl = `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;
          console.log('[Wiki] pageTitle:', pageTitle, 'url:', this.wikiUrl);

          const extractUrl = `https://${locale}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}`;
          const extractResult: any = await this.http.get(extractUrl).toPromise();
          console.log('[Wiki] extractResult', extractResult);
          if (extractResult?.query?.pages) {
            const pages = extractResult.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pages[pageId]?.extract) {
              this.wikiExtract = pages[pageId].extract;
              console.log('[Wiki] extract length:', this.wikiExtract.length);
            }
          }

          // Logga primi 400 caratteri di wikitext per capire cosa parsare
          await this.logWikipediaRaw(pageTitle, locale);

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
      console.warn('Impossibile caricare dati Wikipedia:', err);
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
        points: stats.points || this.careerStats?.points || '—',
        championshipsCount: stats.championshipsCount || this.careerStats?.championshipsCount || '0',
        championshipYears: stats.championshipYears || this.careerStats?.championshipYears || [],
        teams: stats.teams || this.careerStats?.teams || '—',
        teamsArray: stats.teamsArray || this.careerStats?.teamsArray || []
      };
      
      // Se OpenF1 non ha country_code, prova a prenderlo da Wikipedia
      if (stats.country && this.driver && !this.driver.country_code) {
        console.log('[Wiki] Updating country from Wikipedia:', stats.country);
        // Cerca di estrarre codice ISO se presente
        this.driver = { ...this.driver, country_code: this.extractCountryCode(stats.country) };
      }
    }
  }

  // Parsing HTML della pagina Wikipedia (action=parse) per estrarre le righe chiave della tabella carriera
  private async parseWikipediaHtmlStats(pageTitle: string, locale: string): Promise<{ wins?: string; podiums?: string; poles?: string; championships?: string; teams?: string; debut?: string; races?: string; points?: string; championshipsCount?: string; championshipYears?: string[]; teamsArray?: string[]; country?: string } | null> {
    try {
      const parseUrl = `https://${locale}.wikipedia.org/w/api.php?action=parse&origin=*&format=json&page=${encodeURIComponent(pageTitle)}&prop=text`;
      const htmlRes: any = await this.http.get(parseUrl).toPromise();
      const html: string | undefined = htmlRes?.parse?.text?.['*'];
      if (!html) return null;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('table.infobox tr, table.wikitable tr'));
      
      console.log(`[Wiki] Found ${rows.length} rows in tables`);
      
      // Debug: mostra i primi 10 th trovati
      const allTh = Array.from(doc.querySelectorAll('table.infobox th, table.wikitable th')).slice(0, 15);
      allTh.forEach((th, i) => {
        console.log(`[Wiki] Row ${i}: "${th.textContent?.trim()}"`);
      });

      const wanted: Record<'championships' | 'wins' | 'podiums' | 'poles' | 'teams' | 'debut' | 'races' | 'points' | 'country', readonly string[]> = {
        championships: ['mondiali vinti', 'campionati', 'campionati mondiali', 'world championships', 'titoli', 'world champion', 'f1 championships'],
        wins: ['gp vinti', 'vittorie', 'wins', 'race wins', 'gran prix wins'],
        podiums: ['podi', 'podiums', 'podium finishes'],
        poles: ['pole position', 'pole positions', 'pole', 'poles'],
        teams: ['scuderie', 'teams', 'squadre', 'racing teams', 'team'],
        debut: ['esordio', 'debut', 'debutto', 'first race', 'formula one debut'],
        races: ['gp disputati', 'gare', 'races', 'gran premi', 'formula one entries'],
        points: ['punti', 'points', 'punti ottenuti', 'career points', 'formula one points'],
        country: ['nazionalita', 'nationality', 'paese', 'country']
      };

      const found: any = {};

      rows.forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (!th || !td) return;
        const label = this.normalizeLabel(th.textContent || '');
        const valueRaw = this.cleanWikiValue(td.innerHTML || td.textContent || '');

        (Object.entries(wanted) as Array<[keyof typeof wanted, readonly string[]]>).forEach(([key, labels]) => {
          labels.forEach(lab => {
            if (label.includes(this.normalizeLabel(lab))) {
              console.log(`[Wiki] Matched ${key}: "${th.textContent?.trim()}" = "${valueRaw}"`);
              if (key === 'teams') {
                // Split quando troviamo pattern: "anno-anno Nome" o "anno- Nome"
                // Es: "Toro Rosso 2015-2016 Red Bull 2016-" -> ["Toro Rosso 2015-2016", "Red Bull 2016-"]
                const teamsArray = valueRaw
                  .replace(/(\d{4}(?:-\d{4})?-?)\s+([A-Z])/g, '$1|||$2') // Inserisci separatore tra anno e nome maiuscolo
                  .split('|||')
                  .map(v => v.trim())
                  .filter(Boolean)
                  .map(team => this.formatTeamEntry(team));
                
                console.log(`[Wiki] Teams parsed:`, teamsArray);
                found['teamsArray'] = teamsArray;
                found[key] = teamsArray.join(' • ');
              } else if (key === 'championships') {
                // Estrai anni dai titoli: "4 (2021, 2022, 2023, 2024)" -> count: 4, years: [2021, 2022, 2023, 2024]
                const match = valueRaw.match(/(\d+)(?:\s*\(([^)]+)\))?/);
                if (match) {
                  found['championshipsCount'] = match[1];
                  found['championshipYears'] = match[2] ? match[2].split(',').map(y => y.trim()) : [];
                  console.log(`[Wiki] Championships parsed: count=${match[1]}, years=${JSON.stringify(found['championshipYears'])}`);
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
              } else {
                found[key] = valueRaw;
              }
            }
          });
        });
      });

      if (Object.keys(found).length === 0) return null;
      console.log('[Wiki] parsed stats:', {
        debut: found.debut,
        championships: found.championshipsCount,
        championshipYears: found.championshipYears,
        races: found.races,
        wins: found.wins,
        podiums: found.podiums,
        poles: found.poles,
        points: found.points,
        teams: found.teams
      });
      return found;
    } catch (err) {
      console.warn('parseWikipediaHtmlStats errore:', err);
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

  private async logWikipediaRaw(pageTitle: string, locale: string) {
    try {
      const wikitextUrl = `https://${locale}.wikipedia.org/w/api.php?action=query&origin=*&format=json&prop=revisions&rvprop=content&rvslots=main&formatversion=2&titles=${encodeURIComponent(pageTitle)}`;
      const data: any = await this.http.get(wikitextUrl).toPromise();
      const content = data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
      if (content) {
        console.log('[Wiki] raw wikitext sample:', content.slice(0, 400));
      } else {
        console.log('[Wiki] wikitext non trovato');
      }
    } catch (err) {
      console.warn('[Wiki] errore nel log wikitext:', err);
    }
  }
}
