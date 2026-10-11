import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Stato dell'ultima chiamata all'API:
 * - 'ok': dati aggiornati
 * - 'stale': API non raggiungibile, mostriamo dati salvati in cache
 * - 'error': API non raggiungibile e nessun dato in cache
 */
export type ApiStatus = 'ok' | 'stale' | 'error';

export interface HttpCacheOptions {
  prefix: string;                    // prefisso delle chiavi nel localStorage, es. 'openf1:'
  minGapMs: number;                  // pausa minima tra la partenza di due richieste
  maxPerWindow: number;              // massimo di richieste che possono partire...
  windowMs: number;                  // ...in questa finestra di tempo
  ttlFor: (url: string) => number;   // per quanto tempo una risposta resta valida
  maxCachedChars?: number;           // risposte più grandi restano solo in memoria
  retryDelaysMs?: number[];          // attese tra i tentativi dopo un 429
}

// Cache HTTP condivisa dai service delle API esterne (OpenF1, Jolpica): cache in memoria e
// nel localStorage, richieste identiche condivise, coda che rispetta i limiti dell'API e
// nuovi tentativi; se l'API non risponde ripiega sui dati salvati, anche se vecchi.
export class HttpCache {
  readonly status: WritableSignal<ApiStatus> = signal<ApiStatus>('ok');

  private readonly maxCachedChars: number;
  private readonly retryDelaysMs: number[];

  // Cache in memoria (evita di rileggere e decodificare il localStorage a ogni chiamata)
  private readonly memoryCache = new Map<string, { savedAt: number; data: unknown }>();
  // Richieste già partite: chi chiede lo stesso URL nel frattempo aspetta la stessa risposta
  private readonly inFlight = new Map<string, Promise<unknown>>();
  // Orari di partenza delle richieste nella finestra corrente, in ordine
  private readonly scheduledRequests: number[] = [];

  constructor(private readonly http: HttpClient, private readonly options: HttpCacheOptions) {
    this.maxCachedChars = options.maxCachedChars ?? 400_000;
    this.retryDelaysMs = options.retryDelaysMs ?? [2000, 8000, 20000];
  }

  /** GET con cache; un 404 viene rilanciato senza toccare lo stato */
  get<T>(url: string): Promise<T> {
    const pending = this.inFlight.get(url);
    if (pending) return pending as Promise<T>;

    const request = this.load<T>(url).finally(() => this.inFlight.delete(url));
    this.inFlight.set(url, request);
    return request;
  }

  /** Come get, ma se l'API non ha quel dato (404) restituisce una lista vuota */
  async getList<T>(url: string): Promise<T[]> {
    try {
      return await this.get<T[]>(url);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return [];
      throw err;
    }
  }

  private async load<T>(url: string): Promise<T> {
    const key = this.options.prefix + url;
    const cached = (this.memoryCache.get(key) ?? this.readCache<T>(key)) as { savedAt: number; data: T } | null;
    if (cached && Date.now() - cached.savedAt < this.options.ttlFor(url)) {
      this.memoryCache.set(key, cached);
      return cached.data;
    }

    try {
      const data = await this.fetchWithRetry<T>(url);
      this.writeCache(key, data);
      this.status.set('ok');
      return data;
    } catch (err) {
      // 404 = l'API non ha quel dato: non è un problema di connessione
      if (err instanceof HttpErrorResponse && err.status === 404) {
        throw err;
      }
      if (cached) {
        this.status.set('stale');
        return cached.data;
      }
      this.status.set('error');
      throw err;
    }
  }

  private async fetchWithRetry<T>(url: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.waitForRequestSlot();
      try {
        return await firstValueFrom(this.http.get<T>(url));
      } catch (err) {
        // 429 = troppe richieste; 0 = nessuna risposta leggibile (un 429 può arrivare senza header CORS)
        // Se l'API è già risultata irraggiungibile non insistiamo: l'avviso compare subito
        const retryable = err instanceof HttpErrorResponse
          && (err.status === 429 || (err.status === 0 && this.status() !== 'error'));
        if (!retryable || attempt >= this.retryDelaysMs.length) throw err;
        await new Promise(resolve => setTimeout(resolve, this.retryDelaysMs[attempt]));
      }
    }
  }

  private async waitForRequestSlot(): Promise<void> {
    const { minGapMs, maxPerWindow, windowMs } = this.options;
    const now = Date.now();
    while (this.scheduledRequests.length && this.scheduledRequests[0] <= now - windowMs) {
      this.scheduledRequests.shift();
    }

    const last = this.scheduledRequests[this.scheduledRequests.length - 1] ?? 0;
    let startAt = Math.max(now, last + minGapMs);
    // Finestra piena: aspettiamo che la richiesta più vecchia ne esca
    if (this.scheduledRequests.length >= maxPerWindow) {
      const oldestInWindow = this.scheduledRequests[this.scheduledRequests.length - maxPerWindow];
      startAt = Math.max(startAt, oldestInWindow + windowMs);
    }
    this.scheduledRequests.push(startAt);

    if (startAt > now) {
      await new Promise(resolve => setTimeout(resolve, startAt - now));
    }
  }

  private readCache<T>(key: string): { savedAt: number; data: T } | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private writeCache(key: string, data: unknown): void {
    const entry = { savedAt: Date.now(), data };
    this.memoryCache.set(key, entry);

    const json = JSON.stringify(entry);
    if (json.length > this.maxCachedChars) return;
    try {
      localStorage.setItem(key, json);
    } catch {
      // localStorage pieno: liberiamo le voci più vecchie e riproviamo una volta
      this.evictOldest();
      try { localStorage.setItem(key, json); } catch { /* resta solo in memoria */ }
    }
  }

  private evictOldest(): void {
    try {
      const entries = Object.keys(localStorage)
        .filter(k => k.startsWith(this.options.prefix))
        .map(k => ({ k, savedAt: this.readCache(k)?.savedAt ?? 0 }))
        .sort((a, b) => a.savedAt - b.savedAt);
      entries.slice(0, Math.ceil(entries.length / 2)).forEach(e => localStorage.removeItem(e.k));
    } catch { /* ignorato */ }
  }
}
