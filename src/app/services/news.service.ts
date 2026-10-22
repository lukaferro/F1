import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NewsCategory } from './news-state.service';

export interface F1NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  paragraphs?: string[];
  fullContentLoaded?: boolean;
  link: string;
  imageUrl: string;
  publishedAt: string;
  source: string;
  author?: string;
  category: Exclude<NewsCategory, 'Tutte'>;
  readingMinutes: number;
}

interface FeedSource {
  url: string;
  sourceName: string;
}

const FALLBACK_IMAGES: Record<Exclude<NewsCategory, 'Tutte'>, string[]> = {
  'Gare & Paddock': [
    'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200',
    'https://media.istockphoto.com/id/810900482/photo/empty-racing-track-with-sunlight.jpg?s=612x612&w=0&k=20&c=8ndE0gqBB_-zyzYLVtx-oOWRcR4a4HaInGs8IVhC0GA='
  ],
  'Scuderie': [
    'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200'
  ],
  'Piloti': [
    'https://img.freepik.com/foto-premium/ritratto-del-pilota-di-f1-che-indossa-il-casco-pilota-di-formula-uno-in-piedi-sulla-pista-dopo-la-competizione_46383-9870.jpg'
  ],
  'Tecnica': [
    'https://media.istockphoto.com/id/810900482/photo/empty-racing-track-with-sunlight.jpg?s=612x612&w=0&k=20&c=8ndE0gqBB_-zyzYLVtx-oOWRcR4a4HaInGs8IVhC0GA='
  ]
};

export const CURATED_F1_NEWS: F1NewsArticle[] = [
  {
    id: 'f1-2026-aerodinamica-attiva',
    title: 'Regolamento Tecnico F1: come l’aerodinamica attiva e le nuove Power Unit cambiano i sorpassi in pista',
    summary: 'Le monoposto di nuova generazione introducono profili alari mobili anteriori e posteriori combinati con una ripartizione 50/50 tra motore termico ed elettrico.',
    content: 'La rivoluzione regolamentare della Formula 1 ridisegna profondamente il concetto di efficienza aerodinamica e gestione dell’energia. Le vetture dispongono di due configurazioni dinamiche delle ali per massimizzare il carico in curva e abbattere la resistenza all’avanzamento sui rettilinei, mentre la modalità Override fornisce un surplus di potenza elettrica a chi insegue entro il secondo di distacco.',
    paragraphs: [
      'La rivoluzione regolamentare della Formula 1 ridisegna profondamente il concetto di efficienza aerodinamica e gestione dell’energia. Le monoposto adottano un passo ridotto e una carreggiata più compatta, con l’obiettivo di rendere le vetture più agili nei cambi di direzione e favorire i duelli ravvicinati.',
      'Il cuore del nuovo pacchetto è rappresentato dall’aerodinamica attiva: i piloti possono contare su due configurazioni sincrone dei flap anteriori e posteriori, passando dall’assetto ad alto carico per la percorrenza in curva alla configurazione a bassa resistenza aerodinamica sui rettilinei.',
      'Sul fronte delle Power Unit, l’eliminazione dell’MGU-H viene compensata da una parte elettrica triplicata nella potenza (fino a 350 kW dall’MGU-K), portando il bilanciamento energetico a un inedito 50/50 con il motore endotermico V6 turbo alimentato da carburanti 100% sostenibili.',
      'Per agevolare i sorpassi, il tradizionale DRS lascia spazio al sistema Manual Override: quando un pilota si trova a meno di un secondo dalla vettura che lo precede nel punto di rilevamento, dispone di un surplus di energia elettrica utilizzabile fino alle alte velocità.'
    ],
    fullContentLoaded: true,
    link: 'https://www.formula1.com',
    imageUrl: 'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200',
    publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    source: 'F1 Technical Desk',
    author: 'Redazione Tecnica',
    category: 'Tecnica',
    readingMinutes: 4
  },
  {
    id: 'ferrari-sviluppo-galleria-vento',
    title: 'Scuderia Ferrari: pacchetto di aggiornamenti al fondo e nuova gestione gomme per i prossimi appuntamenti',
    summary: 'A Maranello il lavoro al simulatore si concentra sulla finestra di funzionamento degli pneumatici in qualifica e sul passo gara con alto carico di carburante.',
    content: 'Gli ingegneri della Scuderia Ferrari hanno completato la correlazione tra i dati raccolti in pista e la galleria del vento di Maranello. Il nuovo pacchetto aerodinamico mira a stabilizzare il carico generato dai canali Venturi nelle curve a media-alta velocità, riducendo il degrado termico sull’asse posteriore durante gli stint più lunghi.',
    paragraphs: [
      'Gli ingegneri della Scuderia Ferrari hanno completato la correlazione tra i dati raccolti in pista e la galleria del vento di Maranello. Il nuovo pacchetto aerodinamico mira a stabilizzare il carico generato dai canali Venturi nelle curve a media-alta velocità, riducendo il degrado termico sull’asse posteriore durante gli stint più lunghi.',
      'Le sessioni al simulatore hanno permesso di affinare la messa a punto meccanica delle sospensioni, cercando il compromesso ideale tra la rapidità di innesco delle mescole più morbide sul giro secco di qualifica e la protezione del battistrada sulla distanza dei 300 km.',
      'Particolare attenzione è stata dedicata anche all’efficienza del sistema di raffreddamento dei freni e alla gestione dell’energia ibrida nei tratti misti, dove la trazione in uscita dalle curve lente rappresenta un fattore chiave per difendere la posizione.'
    ],
    fullContentLoaded: true,
    link: 'https://it.motorsport.com/f1/news/',
    imageUrl: 'https://media.istockphoto.com/id/810900482/photo/empty-racing-track-with-sunlight.jpg?s=612x612&w=0&k=20&c=8ndE0gqBB_-zyzYLVtx-oOWRcR4a4HaInGs8IVhC0GA=',
    publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    source: 'Motorsport Italia',
    author: 'Marco Bellinazzo',
    category: 'Scuderie',
    readingMinutes: 3
  },
  {
    id: 'duello-verstappen-leclerc-norris',
    title: 'Lotta al vertice sul filo dei millesimi: Verstappen, Norris e Leclerc accendono la sfida mondiale',
    summary: 'Equilibrio mai così sottile in qualifica: tre scuderie racchiuse in meno di due decimi sul giro secco promettono gare combattute fino all’ultima curva.',
    content: 'La convergenza prestazionale tra Red Bull, McLaren, Ferrari e Mercedes ha reso ogni sessione di qualifica decisiva. La capacità dei piloti di estrarre il massimo nel giro di preparazione gomme e la precisione nei pit-stop sotto i 2,2 secondi stanno facendo la differenza nella corsa al titolo iridato.',
    paragraphs: [
      'La convergenza prestazionale tra Red Bull, McLaren, Ferrari e Mercedes ha reso ogni sessione di qualifica decisiva. Con quattro top team racchiusi spesso nell’arco di meno di due decimi di secondo in Q3, ogni minimo dettaglio di guida e di strategia diventa determinante.',
      'La capacità dei piloti di estrarre il massimo nel giro di preparazione degli pneumatici (out-lap) senza surriscaldare la superficie nel terzo settore sta facendo la differenza tra la prima e la terza fila sullo schieramento di partenza.',
      'In gara, dove il passo sulle mescole Medium e Hard si equivale sul filo dei centesimi, le chiamate dal muretto box per l’undercut e la costanza delle squadre nei pit-stop sotto i 2,2 secondi continuano a decidere il podio fino alla bandiera a scacchi.'
    ],
    fullContentLoaded: true,
    link: 'https://it.motorsport.com/f1/news/',
    imageUrl: 'https://img.freepik.com/foto-premium/ritratto-del-pilota-di-f1-che-indossa-il-casco-pilota-di-formula-uno-in-piedi-sulla-pista-dopo-la-competizione_46383-9870.jpg',
    publishedAt: new Date(Date.now() - 9 * 3600_000).toISOString(),
    source: 'Paddock Live',
    author: 'Roberto Chinchero',
    category: 'Piloti',
    readingMinutes: 3
  }
];

const decodeHtmlEntities = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<a[^>]*class=['"]?more['"]?[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"')
    .replace(/&#8230;|&hellip;/gi, '...')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
};

const inferCategory = (title: string, summary: string, rawCategories: string[] = []): Exclude<NewsCategory, 'Tutte'> => {
  const haystack = `${title} ${summary} ${rawCategories.join(' ')}`.toLowerCase();
  if (/(aerodinam|fondo|ala\b|ali\b|power unit|motore|sospension|galleria del vento|tecnica|diffusore|telaio|pneumatic|mescol|regolament)/.test(haystack)) {
    return 'Tecnica';
  }
  if (/(ferrari|mclaren|red bull|mercedes|aston martin|williams|alpine|haas|audi|cadillac|racing bulls|sauber|scuderia|costruttor)/.test(haystack)) {
    return 'Scuderie';
  }
  if (/(verstappen|leclerc|hamilton|norris|piastri|alonso|sainz|russell|antonelli|kimi|gasly|albon|hulkenberg|bearman|lawson|hadjar|colapinto|bottas|perez|vettel|schumacher|senna|pilota|piloti|rinnovo|contratto)/.test(haystack)) {
    return 'Piloti';
  }
  return 'Gare & Paddock';
};

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private readonly http = inject(HttpClient);
  private readonly ttlMs = 10 * 60_000;
  private cachedArticles: F1NewsArticle[] | null = null;
  private cachedAt = 0;

  /**
   * Fonti RSS ufficiali in lingua italiana:
   * - Gazzetta dello Sport espone direttamente CORS `Access-Control-Allow-Origin: *` (funziona sempre anche senza proxy).
   * - Motorsport.com IT e FormulaPassion F1 passano dai rewrite di `proxy.conf.json` (in dev) e `vercel.json` (in produzione).
   */
  private readonly sources: FeedSource[] = [
    {
      url: 'https://www.gazzetta.it/dynamic-feed/rss/section/Formula-1.xml',
      sourceName: 'La Gazzetta dello Sport'
    },
    {
      url: '/api/rss/motorsport',
      sourceName: 'Motorsport.com Italia'
    },
    {
      url: '/api/rss/formulapassion',
      sourceName: 'FormulaPassion'
    }
  ];

  async getLatestNews(forceRefresh = false): Promise<F1NewsArticle[]> {
    if (!forceRefresh && this.cachedArticles && Date.now() - this.cachedAt < this.ttlMs) {
      return this.cachedArticles;
    }

    const results = await Promise.all(
      this.sources.map(src => this.fetchFeed(src).catch(() => [] as F1NewsArticle[]))
    );

    const merged = this.deduplicateAndSort(results.flat());
    if (merged.length > 0) {
      this.cachedArticles = merged;
      this.cachedAt = Date.now();
      return merged;
    }

    this.cachedArticles = CURATED_F1_NEWS;
    this.cachedAt = Date.now();
    return CURATED_F1_NEWS;
  }

  private async fetchFeed(source: FeedSource): Promise<F1NewsArticle[]> {
    const xmlText = await firstValueFrom(
      this.http.get(source.url, { responseType: 'text' })
    );
    return this.parseRssXml(xmlText, source.sourceName);
  }

  parseRssXml(xmlText: string, sourceName: string): F1NewsArticle[] {
    if (!xmlText || (!xmlText.includes('<rss') && !xmlText.includes('<item>'))) {
      return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));

    return items
      .map((item, idx) => this.mapXmlItem(item, sourceName, idx))
      .filter((a): a is F1NewsArticle => !!a);
  }

  private mapXmlItem(item: Element, sourceName: string, index: number): F1NewsArticle | null {
    const rawTitle = item.querySelector('title')?.textContent ?? '';
    const title = decodeHtmlEntities(rawTitle).replace(/^F1\s*\|\s*/i, '');
    if (!title) return null;

    const link = (item.querySelector('link')?.textContent ?? '').trim() || 'https://www.formula1.com';
    const guid = (item.querySelector('guid')?.textContent ?? '').trim() || link || `${sourceName}-${index}`;

    const rawDesc = item.querySelector('description')?.textContent ?? '';
    const cleanedDesc = decodeHtmlEntities(rawDesc);
    const summary = cleanedDesc.length > 220 ? `${cleanedDesc.slice(0, 217).trim()}...` : (cleanedDesc || title);
    const content = cleanedDesc || summary;

    const categories = Array.from(item.querySelectorAll('category'))
      .map(c => decodeHtmlEntities(c.textContent ?? ''))
      .filter(Boolean);

    const creatorEl =
      item.getElementsByTagName('dc:creator')[0] ??
      item.querySelector('author');
    const author = creatorEl?.textContent ? decodeHtmlEntities(creatorEl.textContent) : undefined;

    const pubDateRaw = (item.querySelector('pubDate')?.textContent ?? '').trim();
    const parsedTime = pubDateRaw ? Date.parse(pubDateRaw) : NaN;
    const publishedAt = !Number.isNaN(parsedTime) ? new Date(parsedTime).toISOString() : new Date().toISOString();

    const category = inferCategory(title, summary, categories);
    const imageUrl = this.extractItemImage(item, category, index);

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(2, Math.min(8, Math.ceil(wordCount / 110)));

    return {
      id: guid,
      title,
      summary,
      content,
      link,
      imageUrl,
      publishedAt,
      source: sourceName,
      author,
      category,
      readingMinutes
    };
  }

  private extractItemImage(item: Element, category: Exclude<NewsCategory, 'Tutte'>, index: number): string {
    // 1. <enclosure url="..." /> (Motorsport.com IT)
    const enclosureUrl = item.querySelector('enclosure')?.getAttribute('url');
    if (enclosureUrl && enclosureUrl.startsWith('http')) {
      return enclosureUrl;
    }

    // 2. <media:thumbnail url="..." /> o <media:content url="..." /> (Gazzetta dello Sport)
    const mediaThumb =
      item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') ??
      item.getElementsByTagName('media:content')[0]?.getAttribute('url');
    if (mediaThumb && mediaThumb.startsWith('http')) {
      return mediaThumb;
    }

    // 3. <image_mini> o <image_medium> o <image> (FormulaPassion)
    const fpImage =
      item.querySelector('image_mini')?.textContent?.trim() ||
      item.querySelector('image_medium')?.textContent?.trim() ||
      item.querySelector('image')?.textContent?.trim();
    if (fpImage && fpImage.startsWith('http')) {
      return fpImage;
    }

    // 4. Immagine di fallback per categoria
    const pool = FALLBACK_IMAGES[category];
    return pool[index % pool.length];
  }

  private deduplicateAndSort(articles: F1NewsArticle[]): F1NewsArticle[] {
    const seen = new Set<string>();
    const unique: F1NewsArticle[] = [];

    for (const article of articles) {
      const normKey = article.title.toLowerCase().slice(0, 60);
      if (seen.has(article.id) || seen.has(normKey)) continue;
      seen.add(article.id);
      seen.add(normKey);
      unique.push(article);
    }

    return unique.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  /**
   * Scarica e parsa il testo integrale dell'articolo dalla pagina sorgente tramite proxy,
   * estraendo i paragrafi completi (JSON-LD articleBody + paragrafi HTML dell'articolo)
   * per consentire la lettura completa direttamente all'interno dell'app.
   */
  async fetchFullArticle(article: F1NewsArticle): Promise<F1NewsArticle> {
    if (article.fullContentLoaded && article.paragraphs && article.paragraphs.length > 0) {
      return article;
    }

    const proxyUrl = this.resolveArticleProxyUrl(article.link);
    if (!proxyUrl) {
      article.paragraphs = [article.content || article.summary];
      article.fullContentLoaded = true;
      return article;
    }

    try {
      const htmlText = await firstValueFrom(
        this.http.get(proxyUrl, { responseType: 'text' })
      );
      const paragraphs = this.extractArticleParagraphs(htmlText, article.summary);
      if (paragraphs.length > 0) {
        article.paragraphs = paragraphs;
        article.content = paragraphs.join('\n\n');
        const totalWords = article.content.split(/\s+/).filter(Boolean).length;
        article.readingMinutes = Math.max(2, Math.min(12, Math.ceil(totalWords / 180)));
      } else {
        article.paragraphs = [article.content || article.summary];
      }
    } catch {
      article.paragraphs = [article.content || article.summary];
    } finally {
      article.fullContentLoaded = true;
    }

    return article;
  }

  resolveArticleProxyUrl(link: string): string | null {
    try {
      const u = new URL(link);
      if (u.hostname.includes('motorsport.com')) {
        return `/api/article/motorsport${u.pathname}`;
      }
      if (u.hostname.includes('formulapassion.it')) {
        return `/api/article/formulapassion${u.pathname}`;
      }
      if (u.hostname.includes('gazzetta.it')) {
        return `/api/article/gazzetta${u.pathname}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  extractArticleParagraphs(htmlText: string, summary = ''): string[] {
    if (!htmlText) return [];

    const isBoilerplate = (text: string): boolean => {
      if (text.length < 35) return true;
      return /^(leggi anche|scegli gazzetta|riproduzione riservata|seguici su|iscriviti|foto:|crediti:|menu\b|parte del gruppo)/i.test(text);
    };

    // 1. Estrazione da JSON-LD (articleBody)
    let ldParagraphs: string[] = [];
    const scriptMatches = Array.from(
      htmlText.matchAll(/<script[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi)
    );

    for (const match of scriptMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const candidates = Array.isArray(parsed)
          ? parsed
          : parsed?.['@graph'] && Array.isArray(parsed['@graph'])
            ? parsed['@graph']
            : [parsed];

        for (const item of candidates) {
          if (typeof item?.articleBody === 'string' && item.articleBody.trim().length > 100) {
            const rawBody = item.articleBody
              .replace(/Leggi anche:[\s\S]*$/i, '')
              .trim();

            const lines = rawBody
              .split(/\r?\n+/)
              .map((l: string) => decodeHtmlEntities(l))
              .filter((l: string) => !isBoilerplate(l));

            if (lines.length === 1 && lines[0].length > 350) {
              // Se articleBody è un blocco unico senza ritorni a capo (es. Gazzetta), spezza ogni 2-3 frasi
              const sentences = lines[0].split(/(?<=[.!?»”"])\s+(?=[A-ZÀÈÉÌÒÙ«"“])/);
              const grouped: string[] = [];
              let buffer = '';
              for (const s of sentences) {
                buffer = buffer ? `${buffer} ${s}` : s;
                if (buffer.length >= 260) {
                  grouped.push(buffer.trim());
                  buffer = '';
                }
              }
              if (buffer.trim()) {
                grouped.push(buffer.trim());
              }
              ldParagraphs = grouped;
            } else if (lines.length > ldParagraphs.length) {
              ldParagraphs = lines;
            }
          }
        }
      } catch {
        // Ignora blocchi JSON-LD non validi
      }
    }

    // 2. Estrazione da DOM HTML (<p> nel corpo articolo)
    let domParagraphs: string[] = [];
    try {
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      doc.querySelectorAll('script, style, nav, header, footer, aside, figure, figcaption, .ms-apb, .ms-ap-native').forEach(el => el.remove());

      const containers = doc.querySelectorAll(
        '.ms-article-content, .entry-content, .bck-text, .article-body, article'
      );
      const pElements = containers.length > 0
        ? Array.from(containers).flatMap(c => Array.from(c.querySelectorAll('p')))
        : Array.from(doc.querySelectorAll('article p, main p'));

      const seenP = new Set<string>();
      for (const p of pElements) {
        const cleaned = decodeHtmlEntities(p.textContent ?? '');
        if (!isBoilerplate(cleaned) && !seenP.has(cleaned)) {
          seenP.add(cleaned);
          domParagraphs.push(cleaned);
        }
      }
    } catch {
      // Fallback su ldParagraphs
    }

    const ldLen = ldParagraphs.join(' ').length;
    const domLen = domParagraphs.join(' ').length;
    const chosen = domParagraphs.length >= 2 && domLen >= ldLen * 0.65 ? domParagraphs : (ldParagraphs.length > 0 ? ldParagraphs : domParagraphs);

    // Evita di ripetere il summary se il primo paragrafo è identico al riassunto iniziale
    const normSummary = summary.replace(/\.{3}$/, '').trim().toLowerCase();
    return chosen.filter((p, idx) => {
      if (idx === 0 && normSummary.length > 40 && p.toLowerCase() === normSummary) {
        return false;
      }
      return true;
    });
  }
}
