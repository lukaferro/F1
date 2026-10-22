import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { NewsService } from './news.service';

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), NewsService]
    });
    service = TestBed.inject(NewsService);
  });

  it('should parse Gazzetta dello Sport RSS XML with media:thumbnail and dc:creator', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <item>
            <title>Ferrari pronta con il nuovo fondo a Maranello</title>
            <link>https://www.gazzetta.it/Formula-1/ferrari-nuovo-fondo.shtml</link>
            <dc:creator>Mario Rossi</dc:creator>
            <pubDate>Tue, 20 Oct 2026 21:29:18 +0200</pubDate>
            <description>La Scuderia Ferrari porta in pista gli aggiornamenti aerodinamici.</description>
            <media:thumbnail url="https://dimages2.gazzettaobjects.it/files/ferrari.jpeg"></media:thumbnail>
          </item>
        </channel>
      </rss>`;

    const articles = service.parseRssXml(sampleXml, 'La Gazzetta dello Sport');
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe('Ferrari pronta con il nuovo fondo a Maranello');
    expect(articles[0].author).toBe('Mario Rossi');
    expect(articles[0].imageUrl).toBe('https://dimages2.gazzettaobjects.it/files/ferrari.jpeg');
    expect(articles[0].source).toBe('La Gazzetta dello Sport');
    expect(articles[0].category).toBe('Tecnica');
  });

  it('should parse Motorsport.com IT RSS XML with CDATA, enclosure, and strip Continua a leggere link', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title><![CDATA[F1 | Leclerc carico per il prossimo GP: "Possiamo lottare per la vittoria"]]></title>
            <link>https://it.motorsport.com/f1/news/leclerc-carico/12345/</link>
            <description><![CDATA[Charles Leclerc commenta il passo gara.<a class='more' href='https://it.motorsport.com'>Continua a leggere</a>]]></description>
            <guid isPermaLink="false">12345</guid>
            <pubDate>Wed, 21 Oct 2026 10:00:07 +0000</pubDate>
            <enclosure url="https://cdn-9.motorsport.com/images/amp/leclerc.jpg" type="image/jpeg" length="243233"/>
          </item>
        </channel>
      </rss>`;

    const articles = service.parseRssXml(sampleXml, 'Motorsport.com Italia');
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe('Leclerc carico per il prossimo GP: "Possiamo lottare per la vittoria"');
    expect(articles[0].summary).toBe('Charles Leclerc commenta il passo gara.');
    expect(articles[0].imageUrl).toBe('https://cdn-9.motorsport.com/images/amp/leclerc.jpg');
    expect(articles[0].category).toBe('Piloti');
  });

  it('should return empty array if response is HTML instead of RSS XML', () => {
    const htmlFallback = '<!DOCTYPE html><html><body>SPA index</body></html>';
    expect(service.parseRssXml(htmlFallback, 'Motorsport.com Italia')).toEqual([]);
  });

  it('should resolve proxy URLs for Motorsport, FormulaPassion, and Gazzetta articles', () => {
    expect(service.resolveArticleProxyUrl('https://it.motorsport.com/f1/news/ferrari-austin/12345/?utm_source=RSS'))
      .toBe('/api/article/motorsport/f1/news/ferrari-austin/12345/');
    expect(service.resolveArticleProxyUrl('https://www.formulapassion.it/f1/f1-news/leclerc-analisi'))
      .toBe('/api/article/formulapassion/f1/f1-news/leclerc-analisi');
    expect(service.resolveArticleProxyUrl('https://www.gazzetta.it/motori/ferrari/articolo.shtml'))
      .toBe('/api/article/gazzetta/motori/ferrari/articolo.shtml');
  });

  it('should extract full article paragraphs from JSON-LD articleBody and HTML paragraphs', () => {
    const sampleHtml = `<!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "articleBody": "La Scuderia Ferrari scenderà in pista ad Austin con un nuovo pacchetto aerodinamico studiato in galleria del vento.\\nIl fondo modificato punta a migliorare il carico nei curvoni veloci del primo settore del Circuito delle Americhe.\\nLeggi anche:\\nAltro articolo"
            }
          </script>
        </head>
        <body></body>
      </html>`;

    const paragraphs = service.extractArticleParagraphs(sampleHtml);
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toContain('nuovo pacchetto aerodinamico');
    expect(paragraphs[1]).toContain('Circuito delle Americhe');
  });
});
