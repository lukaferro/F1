import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type WikidataProperty = 'P18' | 'P154'; // P18 = image, P154 = logo image

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*';
const COMMONS_FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const BATCH_SIZE = 40;
const CACHE_PREFIX = 'f1:wikidata:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

interface CachedItem {
  value: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class WikidataService {
  private readonly http: HttpClient | null;
  private readonly memoryCache = new Map<string, string | null>();

  constructor(http?: HttpClient | null) {
    this.http = http !== undefined ? http : inject(HttpClient, { optional: true });
  }

  /**
   * Converte il nome file di Wikimedia Commons in un URL per l'immagine scalata
   */
  commonsFileUrl(fileName: string, width = 500): string {
    const clean = encodeURIComponent(fileName.replace(/ /g, '_'));
    return `${COMMONS_FILE_BASE}/${clean}?width=${width}`;
  }

  /**
   * Recupera la proprietà P18 (foto ufficiale) per un'entità partendo dal titolo Wikipedia in inglese
   */
  async getDriverImage(wikiTitle: string): Promise<string | null> {
    if (!wikiTitle) return null;
    return this.getPropertyValue(wikiTitle, 'P18');
  }

  /**
   * Recupera la proprietà P154 (logo ufficiale) per una scuderia dal titolo Wikipedia in inglese
   */
  async getTeamLogo(wikiTitle: string): Promise<string | null> {
    if (!wikiTitle) return null;
    return this.getPropertyValue(wikiTitle, 'P154');
  }

  /**
   * Recupera una proprietà Wikidata ('P18' foto, 'P154' logo) con caching locale a due livelli
   */
  async getPropertyValue(wikiTitle: string, prop: WikidataProperty, width = 500): Promise<string | null> {
    const normTitle = wikiTitle.trim().replace(/ /g, '_');
    const cacheKey = `${normTitle}:${prop}`;

    // 1. Cache in-memory
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey) ?? null;
    }

    // 2. LocalStorage cache
    const stored = this.readStorage(cacheKey);
    if (stored !== undefined) {
      this.memoryCache.set(cacheKey, stored);
      return stored;
    }

    // 3. Richiesta Wikidata API
    try {
      const url = `${WIKIDATA_API}&sites=enwiki&titles=${encodeURIComponent(normTitle)}&props=claims`;
      const res = await this.fetchJson<any>(url);
      const entities = res?.entities || {};
      const entity = Object.values(entities)[0] as any;

      const claims = entity?.claims?.[prop];
      const rawFileName = claims?.[0]?.mainsnak?.datavalue?.value;

      if (rawFileName && typeof rawFileName === 'string') {
        const fileUrl = this.commonsFileUrl(rawFileName, width);
        this.writeStorage(cacheKey, fileUrl);
        this.memoryCache.set(cacheKey, fileUrl);
        return fileUrl;
      }

      this.writeStorage(cacheKey, null);
      this.memoryCache.set(cacheKey, null);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Risolve in batch le immagini Wikidata per una lista di titoli Wikipedia
   */
  async getBatchImages(wikiTitles: string[], prop: WikidataProperty = 'P18', width = 500): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const missing: string[] = [];

    for (const title of wikiTitles) {
      if (!title) continue;
      const norm = title.trim().replace(/ /g, '_');
      const cacheKey = `${norm}:${prop}`;

      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey);
        if (cached) results.set(title, cached);
      } else {
        const stored = this.readStorage(cacheKey);
        if (stored !== undefined) {
          this.memoryCache.set(cacheKey, stored);
          if (stored) results.set(title, stored);
        } else {
          missing.push(norm);
        }
      }
    }

    if (missing.length === 0) return results;

    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      batches.push(missing.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(
      batches.map(async batch => {
        try {
          const url = `${WIKIDATA_API}&sites=enwiki&titles=${encodeURIComponent(batch.join('|'))}&props=claims`;
          const res = await this.fetchJson<any>(url);
          const entities = res?.entities || {};

          for (const ent of Object.values(entities) as any[]) {
            const claims = ent?.claims?.[prop];
            const rawFileName = claims?.[0]?.mainsnak?.datavalue?.value;
            const enTitle = ent?.sitelinks?.enwiki?.title?.replace(/ /g, '_');

            if (enTitle) {
              const cacheKey = `${enTitle}:${prop}`;
              if (rawFileName && typeof rawFileName === 'string') {
                const fileUrl = this.commonsFileUrl(rawFileName, width);
                this.writeStorage(cacheKey, fileUrl);
                this.memoryCache.set(cacheKey, fileUrl);
                results.set(enTitle, fileUrl);
              } else {
                this.writeStorage(cacheKey, null);
                this.memoryCache.set(cacheKey, null);
              }
            }
          }
        } catch {
          // In caso di errore di rete, continua senza bloccare le altre risorse
        }
      })
    );

    return results;
  }

  private fetchJson<T>(url: string): Promise<T> {
    if (this.http) {
      return new Promise((resolve, reject) => {
        this.http!.get<T>(url).subscribe({
          next: data => resolve(data),
          error: err => reject(err)
        });
      });
    }
    if (typeof fetch !== 'undefined') {
      return fetch(url).then(r => r.json());
    }
    return Promise.reject(new Error('No HTTP transport available'));
  }

  private readStorage(key: string): string | null | undefined {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return undefined;
      const parsed: CachedItem = JSON.parse(item);
      if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return undefined;
      }
      return parsed.value;
    } catch {
      return undefined;
    }
  }

  private writeStorage(key: string, value: string | null): void {
    try {
      const item: CachedItem = {
        value: value ?? '',
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch {
      // Ignora errori di quota localStorage
    }
  }
}
