import { inject, Injectable } from '@angular/core';
import { WikidataService } from './wikidata.service';
import {
  circuitMapUrl,
  currentSeasonPhotoUrl,
  getActiveMediaSeason,
  hiResHeadshotUrl,
  previousCircuitMapUrl,
  previousSeasonPhotoUrl
} from '../utils/f1-media';
import { constructorLogo } from '../utils/constructor-branding';

export interface DriverMediaInfo {
  driverId?: string;
  fullName?: string;
  code?: string;
  name_acronym?: string;
  team_name?: string;
  headshot_url?: string;
  wikiTitle?: string;
  team_color?: string;
}

const CACHE_PREFIX = 'f1:media-pipeline:';

@Injectable({
  providedIn: 'root'
})
export class MediaPipelineService {
  private readonly wikidata: WikidataService | null;
  private readonly memoryCache = new Map<string, string>();

  constructor(wikidata?: WikidataService | null) {
    this.wikidata = wikidata !== undefined ? wikidata : inject(WikidataService, { optional: true });
  }

  /**
   * Restituisce l'anno della stagione corrente di riferimento
   */
  getActiveSeason(): number {
    return getActiveMediaSeason();
  }

  /**
   * Genera un avatar SVG vettoriale elegante con le iniziali e il colore del team
   */
  generateInitialsAvatar(nameOrCode: string, colorHex = 'e10600'): string {
    const cleanColor = colorHex.replace('#', '') || 'e10600';
    const text = (nameOrCode || 'F1').trim();
    const initials = text.length <= 3
      ? text.toUpperCase()
      : text.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#${cleanColor}" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#${cleanColor}" stop-opacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="16" fill="url(#grad)" />
        <rect width="98" height="98" x="1" y="1" rx="15" fill="none" stroke="#${cleanColor}" stroke-width="1.5" stroke-opacity="0.6"/>
        <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">
          ${initials}
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Costruisce la catena di fallback a cascata ordinata per qualità per una foto pilota:
   * 1. CDN Formula 1 stagione corrente (media.formula1.com)
   * 2. CDN Formula 1 stagione precedente (fondamentale prima dei photoshoot del nuovo anno)
   * 3. Headshot OpenF1 ad alta risoluzione (4col)
   * 4. Avatar vettoriale SVG generato istantaneamente
   */
  getDriverPhotoChain(driver: DriverMediaInfo, season = this.getActiveSeason()): string[] {
    const chain: string[] = [];

    // 1. F1 CDN stagione attiva
    const cUrl = currentSeasonPhotoUrl({ team_name: driver.team_name, headshot_url: driver.headshot_url }, season);
    if (cUrl) chain.push(cUrl);

    // 2. F1 CDN stagione precedente
    const pUrl = previousSeasonPhotoUrl({ team_name: driver.team_name, headshot_url: driver.headshot_url }, season);
    if (pUrl && !chain.includes(pUrl)) chain.push(pUrl);

    // 3. OpenF1 4col
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    if (headshot && !chain.includes(headshot)) chain.push(headshot);

    // 4. Se presente in memoria o cache Wikidata
    const wikiKey = driver.wikiTitle || driver.fullName;
    if (wikiKey) {
      const cachedWiki = this.memoryCache.get(`wiki:${wikiKey}`);
      if (cachedWiki && !chain.includes(cachedWiki)) chain.push(cachedWiki);
    }

    // 5. Fallback vettoriale garantito a 0 ms
    const initialName = driver.name_acronym || driver.code || driver.fullName || 'F1';
    chain.push(this.generateInitialsAvatar(initialName, driver.team_color));

    return chain;
  }

  /**
   * Risolve in modo asincrono la foto pilota sfruttando anche Wikidata API (P18) se necessario
   */
  async resolveDriverPhoto(driver: DriverMediaInfo, season = this.getActiveSeason()): Promise<string> {
    const cacheKey = `driver:${driver.driverId || driver.code || driver.fullName}:${season}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    const stored = this.readStorage(cacheKey);
    if (stored) {
      this.memoryCache.set(cacheKey, stored);
      return stored;
    }

    // 1. Prova prima la CDN F1 corrente
    const currentUrl = currentSeasonPhotoUrl({ team_name: driver.team_name, headshot_url: driver.headshot_url }, season);
    if (currentUrl) {
      this.writeStorage(cacheKey, currentUrl);
      this.memoryCache.set(cacheKey, currentUrl);
      return currentUrl;
    }

    // 2. Prova la CDN F1 precedente
    const prevUrl = previousSeasonPhotoUrl({ team_name: driver.team_name, headshot_url: driver.headshot_url }, season);
    if (prevUrl) {
      this.writeStorage(cacheKey, prevUrl);
      this.memoryCache.set(cacheKey, prevUrl);
      return prevUrl;
    }

    // 3. Prova OpenF1 4col
    const headshot = hiResHeadshotUrl(driver.headshot_url);
    if (headshot) {
      this.writeStorage(cacheKey, headshot);
      this.memoryCache.set(cacheKey, headshot);
      return headshot;
    }

    // 4. Prova Wikidata P18
    const wikiTitle = driver.wikiTitle || driver.fullName;
    if (wikiTitle) {
      try {
        const wikiPhoto = await this.wikidata.getDriverImage(wikiTitle);
        if (wikiPhoto) {
          this.memoryCache.set(`wiki:${wikiTitle}`, wikiPhoto);
          this.writeStorage(cacheKey, wikiPhoto);
          this.memoryCache.set(cacheKey, wikiPhoto);
          return wikiPhoto;
        }
      } catch {
        // Fallback al passaggio successivo
      }
    }

    // 5. Fallback avatar vettoriale
    const initialName = driver.name_acronym || driver.code || driver.fullName || 'F1';
    const fallback = this.generateInitialsAvatar(initialName, driver.team_color);
    this.memoryCache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Risolve il logo ufficiale del costruttore con fallback su Wikidata P154
   */
  async resolveConstructorLogo(constructorId: string, teamName?: string, wikiTitle?: string): Promise<string | undefined> {
    const cacheKey = `logo:${constructorId}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // 1. Prova il catalogo SVG/PNG locale
    const local = constructorLogo(constructorId);
    if (local?.url) {
      this.memoryCache.set(cacheKey, local.url);
      return local.url;
    }

    // 2. LocalStorage cache
    const stored = this.readStorage(cacheKey);
    if (stored) {
      this.memoryCache.set(cacheKey, stored);
      return stored;
    }

    // 3. Interroga Wikidata P154
    const targetTitle = wikiTitle || teamName || constructorId;
    try {
      const wikiLogo = await this.wikidata.getTeamLogo(targetTitle);
      if (wikiLogo) {
        this.writeStorage(cacheKey, wikiLogo);
        this.memoryCache.set(cacheKey, wikiLogo);
        return wikiLogo;
      }
    } catch {
      // continua verso fallback
    }

    return undefined;
  }

  /**
   * Risolve la mappa del tracciato con fallback multi-anno (stagione corrente -> stagione precedente)
   */
  resolveCircuitMap(circuitShortName: string | undefined, season = this.getActiveSeason()): { current: string | undefined; fallback: string | undefined } {
    return {
      current: circuitMapUrl(circuitShortName, season),
      fallback: previousCircuitMapUrl(circuitShortName, season)
    };
  }

  /**
   * Gestore unificato di errore immagine `<img> (error)="advanceImageFallback($event, chain)"`
   * che scorre la catena di fallback in ordine senza loop infiniti.
   */
  advanceImageFallback(event: Event, fallbackChain: string[]): void {
    const img = event.target as HTMLImageElement;
    if (!img || !fallbackChain || fallbackChain.length === 0) return;

    const currentSrc = img.src;
    const currentIndex = fallbackChain.findIndex(url => url === currentSrc || (url.startsWith('data:') && currentSrc.startsWith('data:')));
    const nextIndex = currentIndex + 1;

    if (nextIndex < fallbackChain.length) {
      img.src = fallbackChain[nextIndex];
    }
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(CACHE_PREFIX + key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      localStorage.setItem(CACHE_PREFIX + key, value);
    } catch {
      // Quota localStorage superata o disattivata
    }
  }
}
