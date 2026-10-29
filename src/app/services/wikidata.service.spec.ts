import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { WikidataService } from './wikidata.service';

describe('WikidataService', () => {
  let service: WikidataService;
  let httpMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    httpMock = {
      get: vi.fn()
    };
    service = new WikidataService(httpMock as any);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('generates correct Wikimedia Commons FilePath URL', () => {
    const url = service.commonsFileUrl('Ferrari wordmark.svg', 500);
    expect(url).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Ferrari_wordmark.svg?width=500');
  });

  it('fetches P18 image for driver and caches in localStorage', async () => {
    const mockResponse = {
      entities: {
        Q17541912: {
          claims: {
            P18: [
              {
                mainsnak: {
                  datavalue: {
                    value: 'Charles_Leclerc_2024.jpg'
                  }
                }
              }
            ]
          }
        }
      }
    };

    httpMock.get.mockReturnValue(of(mockResponse));

    const result = await service.getDriverImage('Charles_Leclerc');
    expect(result).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Charles_Leclerc_2024.jpg?width=500');

    // Second call should come from cache without another HTTP request
    httpMock.get.mockClear();
    const cachedResult = await service.getDriverImage('Charles_Leclerc');
    expect(cachedResult).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Charles_Leclerc_2024.jpg?width=500');
    expect(httpMock.get).not.toHaveBeenCalled();
  });

  it('fetches P154 logo for constructor', async () => {
    const mockResponse = {
      entities: {
        Q27586: {
          claims: {
            P154: [
              {
                mainsnak: {
                  datavalue: {
                    value: 'Ferrari_wordmark.svg'
                  }
                }
              }
            ]
          }
        }
      }
    };

    httpMock.get.mockReturnValue(of(mockResponse));

    const result = await service.getTeamLogo('Scuderia_Ferrari');
    expect(result).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Ferrari_wordmark.svg?width=500');
  });

  it('returns null gracefully on network failure without throwing', async () => {
    httpMock.get.mockReturnValue(throwError(() => new Error('Network error')));
    const result = await service.getDriverImage('NonExistentDriver');
    expect(result).toBeNull();
  });

  it('resolves batch images for multiple titles', async () => {
    const mockResponse = {
      entities: {
        Q1: {
          sitelinks: { enwiki: { title: 'Charles Leclerc' } },
          claims: { P18: [{ mainsnak: { datavalue: { value: 'Leclerc.jpg' } } }] }
        },
        Q2: {
          sitelinks: { enwiki: { title: 'Lando Norris' } },
          claims: { P18: [{ mainsnak: { datavalue: { value: 'Norris.jpg' } } }] }
        }
      }
    };

    httpMock.get.mockReturnValue(of(mockResponse));

    const batch = await service.getBatchImages(['Charles Leclerc', 'Lando Norris'], 'P18');
    expect(batch.get('Charles_Leclerc')).toContain('Leclerc.jpg');
    expect(batch.get('Lando_Norris')).toContain('Norris.jpg');
  });
});
