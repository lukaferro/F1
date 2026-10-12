import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface WikipediaBio {
  extract: string;
  url: string;
  image?: string;
}

interface WikiPage { title: string; missing?: string; extract?: string; thumbnail?: { source: string }; langlinks?: Array<{ lang: string; '*': string }>; }
interface WikiQuery {
  query?: {
    pages?: Record<string, WikiPage>;
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    search?: Array<{ title: string }>;
  };
}

const api = (lang: string) => `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*`;
const pageUrl = (lang: string, title: string) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const firstPage = (res: WikiQuery): WikiPage | undefined => Object.values(res.query?.pages ?? {})[0];
const IMAGE_BATCH = 50; // massimo di titoli per richiesta

// Nomi alternativi per la ricerca (alcuni piloti hanno su Wikipedia un nome diverso da OpenF1)
const NAME_VARIANTS: Record<string, string[]> = {
  'ISACK HADJAR': ['Isack Hadjar', 'Isack Hadjar (racing driver)'],
  'ANDREA KIMI ANTONELLI': ['Andrea Kimi Antonelli', 'Kimi Antonelli', 'Andrea Antonelli'],
  'LIAM LAWSON': ['Liam Lawson', 'Liam Lawson (racing driver)'],
  'OLIVER BEARMAN': ['Oliver Bearman', 'Ollie Bearman'],
  'FRANCO COLAPINTO': ['Franco Colapinto'],
  'YUKI TSUNODA': ['Yuki Tsunoda'],
  'ESTEBAN OCON': ['Esteban Ocon']
};

// Biografie e foto dei piloti da Wikipedia (in italiano quando c'è)
@Injectable({ providedIn: 'root' })
export class WikipediaService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<unknown>>();

  /**
   * Con il titolo della pagina inglese (da Jolpica) bastano al massimo 2 richieste:
   * la pagina inglese con foto e link alla versione italiana, poi il testo italiano.
   * Senza titolo si cerca per nome, prima in italiano e poi in inglese.
   */
  getBio(options: { title?: string; name: string }): Promise<WikipediaBio | null> {
    const key = `bio:${options.title ?? options.name}`;
    // un errore di rete non resta in cache (si riprova alla prossima visita); una pagina assente sì
    return this.cached(key, () => options.title ? this.bioByTitle(options.title) : this.bioBySearch(options.name))
      .catch(() => null);
  }

  /** Foto (miniatura da 400px) per titolo di pagina inglese; i titoli senza foto mancano dalla mappa */
  async getImages(titles: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(titles.filter(Boolean))];
    const batches: string[][] = [];
    for (let i = 0; i < unique.length; i += IMAGE_BATCH) batches.push(unique.slice(i, i + IMAGE_BATCH));
    const results = await Promise.all(batches.map(batch =>
      this.cached(`img:${batch.join('|')}`, () => this.imageBatch(batch))
        .catch(() => new Map<string, string>())));  // senza Wikipedia restano le iniziali
    return new Map(results.flatMap(m => [...m]));
  }

  private async imageBatch(titles: string[]): Promise<Map<string, string>> {
    const images = new Map<string, string>();
    const res = await this.get(`${api('en')}&prop=pageimages&piprop=thumbnail&pithumbsize=400&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`);
    const pages = Object.values(res.query?.pages ?? {});
    for (const title of titles) {
      // il titolo richiesto può essere stato normalizzato (es. "_" → spazio) e poi rediretto
      let resolved = res.query?.normalized?.find(n => n.from === title)?.to ?? title;
      resolved = res.query?.redirects?.find(r => r.from === resolved)?.to ?? resolved;
      const page = pages.find(p => p.title === resolved || p.title === resolved.replace(/_/g, ' '));
      if (page?.thumbnail?.source) images.set(title, page.thumbnail.source);
    }
    return images;
  }

  private async bioByTitle(title: string): Promise<WikipediaBio | null> {
    const en = firstPage(await this.get(
      `${api('en')}&prop=extracts|pageimages|langlinks&exintro=1&explaintext=1&redirects=1&piprop=thumbnail&pithumbsize=400&lllang=it&titles=${encodeURIComponent(title)}`));
    if (!en || en.missing !== undefined || !en.extract) return null;
    const image = en.thumbnail?.source;

    const itTitle = en.langlinks?.find(l => l.lang === 'it')?.['*'];
    if (itTitle) {
      // se la versione italiana non risponde resta quella inglese
      const it = firstPage(await this.get(`${api('it')}&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(itTitle)}`).catch(() => ({})));
      if (it?.extract) return { extract: it.extract, url: pageUrl('it', it.title), image };
    }
    return { extract: en.extract, url: pageUrl('en', en.title), image };
  }

  private async bioBySearch(name: string): Promise<WikipediaBio | null> {
    const names = NAME_VARIANTS[name.toUpperCase()] || [name];
    for (const lang of ['it', 'en']) {
      for (const searchName of names) {
        const search = await this.get(`${api(lang)}&list=search&srsearch=${encodeURIComponent(searchName)}`);
        const pageTitle = search.query?.search?.[0]?.title;
        if (!pageTitle) continue;
        const page = firstPage(await this.get(`${api(lang)}&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}`));
        if (page?.extract) return { extract: page.extract, url: pageUrl(lang, pageTitle) };
      }
    }
    return null;
  }

  private get(url: string): Promise<WikiQuery> {
    return firstValueFrom(this.http.get<WikiQuery>(url));
  }

  // Richieste uguali condivise e ricordate per la sessione (le biografie non cambiano di continuo)
  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    let pending = this.cache.get(key) as Promise<T> | undefined;
    if (!pending) {
      pending = load().catch(err => {
        this.cache.delete(key);
        throw err;
      });
      this.cache.set(key, pending);
    }
    return pending;
  }
}
