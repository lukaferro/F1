import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';

import { WikipediaService } from './wikipedia.service';

const EN = 'https://en.wikipedia.org/w/api.php';
const IT = 'https://it.wikipedia.org/w/api.php';

describe('WikipediaService', () => {
  let service: WikipediaService;
  let http: HttpTestingController;

  // le richieste partono dopo qualche await: aspettiamo che quella cercata sia partita
  const next = async (match: (url: string) => boolean): Promise<TestRequest> => {
    for (let i = 0; i < 50; i++) {
      const found = http.match(req => match(req.urlWithParams));
      if (found.length) return found[0];
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    throw new Error('richiesta non partita');
  };
  const titlesOf = (url: string) => decodeURIComponent(new URL(url).searchParams.get('titles') ?? '').split('|');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WikipediaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const enPage = (extra: object) => ({
    query: { pages: { '1': { pageid: 1, title: 'Ayrton Senna', extract: 'English text.', thumbnail: { source: 'https://img/senna.jpg' }, ...extra } } }
  });

  it('reads the italian bio with two requests when the page has an italian version', async () => {
    const result = service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    const en = await next(url => url.startsWith(EN));
    expect(titlesOf(en.request.urlWithParams)).toEqual(['Ayrton_Senna']);
    expect(en.request.urlWithParams).toContain('lllang=it');
    en.flush(enPage({ langlinks: [{ lang: 'it', '*': 'Ayrton Senna' }] }));
    (await next(url => url.startsWith(IT))).flush({ query: { pages: { '9': { title: 'Ayrton Senna', extract: 'Testo italiano.' } } } });

    expect(await result).toEqual({
      extract: 'Testo italiano.', url: 'https://it.wikipedia.org/wiki/Ayrton_Senna', image: 'https://img/senna.jpg'
    });
  });

  it('falls back to the english extract without an italian version', async () => {
    const result = service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    (await next(url => url.startsWith(EN))).flush(enPage({}));

    expect(await result).toEqual({
      extract: 'English text.', url: 'https://en.wikipedia.org/wiki/Ayrton_Senna', image: 'https://img/senna.jpg'
    });
  });

  it('returns null for a missing page', async () => {
    const result = service.getBio({ title: 'Nobody_At_All', name: 'Nobody' });
    (await next(url => url.startsWith(EN))).flush({ query: { pages: { '-1': { title: 'Nobody At All', missing: '' } } } });

    expect(await result).toBeNull();
  });

  it('searches by name without a title', async () => {
    const result = service.getBio({ name: 'Ayrton Senna' });
    const search = await next(url => url.startsWith(IT) && url.includes('list=search'));
    expect(search.request.urlWithParams).toContain('srsearch=Ayrton%20Senna');
    search.flush({ query: { search: [{ title: 'Ayrton Senna' }] } });
    (await next(url => url.startsWith(IT) && url.includes('prop=extracts'))).flush({
      query: { pages: { '9': { title: 'Ayrton Senna', extract: 'Testo italiano.' } } }
    });

    expect(await result).toEqual({ extract: 'Testo italiano.', url: 'https://it.wikipedia.org/wiki/Ayrton_Senna' });
  });

  it('loads images fifty titles at a time', async () => {
    const titles = Array.from({ length: 60 }, (_, i) => `Driver_${i}`);
    const result = service.getImages(titles);
    const requests: TestRequest[] = [await next(url => url.includes('Driver_0'))];
    requests.push(await next(url => url.includes('Driver_50')));
    expect(titlesOf(requests[0].request.urlWithParams).length).toBe(50);
    expect(titlesOf(requests[1].request.urlWithParams).length).toBe(10);
    requests.forEach(req => req.flush({
      query: { pages: Object.fromEntries(titlesOf(req.request.urlWithParams).map((t, i) => [String(i), { title: t.replace(/_/g, ' '), thumbnail: { source: `https://img/${t}.jpg` } }])) }
    }));

    const images = await result;
    expect(images.size).toBe(60);
    expect(images.get('Driver_59')).toBe('https://img/Driver_59.jpg');
  });

  it('follows redirects and normalized titles for images', async () => {
    const result = service.getImages(['Nico_Hulkenberg']);
    (await next(url => url.startsWith(EN))).flush({
      query: {
        normalized: [{ from: 'Nico_Hulkenberg', to: 'Nico Hulkenberg' }],
        redirects: [{ from: 'Nico Hulkenberg', to: 'Nico Hülkenberg' }],
        pages: { '5': { title: 'Nico Hülkenberg', thumbnail: { source: 'https://img/hulk.jpg' } } }
      }
    });

    expect((await result).get('Nico_Hulkenberg')).toBe('https://img/hulk.jpg');
  });

  it('does not remember a bio that failed', async () => {
    const first = service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    (await next(url => url.startsWith(EN))).error(new ProgressEvent('error'));
    expect(await first).toBeNull();

    const second = service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    (await next(url => url.startsWith(EN))).flush(enPage({}));
    expect((await second)?.extract).toBe('English text.');
  });

  it('serves a cached bio without new requests', async () => {
    const first = service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    (await next(url => url.startsWith(EN))).flush(enPage({}));
    await first;

    expect((await service.getBio({ title: 'Ayrton_Senna', name: 'Ayrton Senna' }))?.extract).toBe('English text.');
  });
});
