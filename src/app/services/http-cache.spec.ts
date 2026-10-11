import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HttpCache, HttpCacheOptions } from './http-cache';

const URL_A = 'https://example.test/a';

// le richieste partono dopo un passaggio asincrono (la coda)
const nextTick = () => new Promise(resolve => setTimeout(resolve));

describe('HttpCache', () => {
  let httpMock: HttpTestingController;

  const createCache = (options: Partial<HttpCacheOptions> = {}) => new HttpCache(TestBed.inject(HttpClient), {
    prefix: 'test:',
    minGapMs: 0,
    maxPerWindow: 100,
    windowMs: 1000,
    ttlFor: () => 60_000,
    ...options
  });

  beforeEach(() => {
    Object.keys(localStorage).filter(k => k.startsWith('test:')).forEach(k => localStorage.removeItem(k));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('serves a cached response within its TTL', async () => {
    const cache = createCache();
    const first = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush([1]);
    await first;

    expect(await cache.get<number[]>(URL_A)).toEqual([1]);
    httpMock.expectNone(URL_A);
  });

  it('refetches after the TTL expires', async () => {
    const cache = createCache({ ttlFor: () => 0 });
    const first = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush([1]);
    await first;

    const second = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush([2]);
    expect(await second).toEqual([2]);
  });

  it('returns stale data and sets status stale when the API fails', async () => {
    const cache = createCache({ ttlFor: () => 0 });
    const first = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush([1]);
    await first;

    const second = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(await second).toEqual([1]);
    expect(cache.status()).toBe('stale');
  });

  it('getList returns [] on 404 and leaves status ok', async () => {
    const cache = createCache();
    const list = cache.getList<number>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush({ detail: 'No results found.' }, { status: 404, statusText: 'Not Found' });
    expect(await list).toEqual([]);
    expect(cache.status()).toBe('ok');
  });

  it('retries a 429 and resolves with the next response', async () => {
    const cache = createCache({ retryDelaysMs: [10] });
    const result = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    await new Promise(resolve => setTimeout(resolve, 30));
    httpMock.expectOne(URL_A).flush([7]);
    expect(await result).toEqual([7]);
  });

  it('never starts more than maxPerWindow requests per window', async () => {
    vi.useFakeTimers();
    const cache = createCache({ maxPerWindow: 2, windowMs: 1000 });
    const results = ['x', 'y', 'z'].map(p => cache.get(`https://example.test/${p}`));

    await vi.advanceTimersByTimeAsync(0);
    const started = httpMock.match(() => true);
    expect(started.length).toBe(2);
    started.forEach(r => r.flush([]));

    await vi.advanceTimersByTimeAsync(1000);
    httpMock.expectOne('https://example.test/z').flush([]);
    await Promise.all(results);
  });

  it('evicts the oldest entries when localStorage is full', async () => {
    localStorage.setItem('test:old', JSON.stringify({ savedAt: 1, data: [] }));
    localStorage.setItem('test:recent', JSON.stringify({ savedAt: 2, data: [] }));
    const realSetItem = Storage.prototype.setItem;
    let failed = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === `test:${URL_A}` && !failed) {
        failed = true;
        throw new DOMException('full', 'QuotaExceededError');
      }
      return realSetItem.call(this, key, value);
    });

    const cache = createCache();
    const result = cache.get<number[]>(URL_A);
    await nextTick();
    httpMock.expectOne(URL_A).flush([1]);
    await result;

    expect(localStorage.getItem('test:old')).toBeNull();
    expect(localStorage.getItem(`test:${URL_A}`)).not.toBeNull();
  });
});
