import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaPipelineService } from './media-pipeline.service';

describe('MediaPipelineService', () => {
  let service: MediaPipelineService;
  let wikidataMock: {
    getDriverImage: ReturnType<typeof vi.fn>;
    getTeamLogo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    wikidataMock = {
      getDriverImage: vi.fn(),
      getTeamLogo: vi.fn()
    };
    service = new MediaPipelineService(wikidataMock as any);
  });

  it('generates an SVG initials avatar with team color', () => {
    const avatar = service.generateInitialsAvatar('Charles Leclerc', 'e80020');
    expect(avatar).toContain('data:image/svg+xml;utf8');
    expect(decodeURIComponent(avatar)).toContain('CL');
    expect(decodeURIComponent(avatar)).toContain('#e80020');
  });

  it('builds a multi-tier fallback chain for official driver photos', () => {
    const headshot = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png';
    const chain = service.getDriverPhotoChain({
      fullName: 'Lando Norris',
      code: 'NOR',
      name_acronym: 'NOR',
      team_name: 'McLaren',
      headshot_url: headshot,
      team_color: 'ff8000'
    }, 2026);

    // 1. Current season F1 CDN
    expect(chain[0]).toContain('/2026/mclaren/lannor01/2026mclarenlannor01right.webp');
    // 2. Previous season F1 CDN
    expect(chain[1]).toContain('/2025/mclaren/lannor01/2025mclarenlannor01right.webp');
    // 3. OpenF1 4col
    expect(chain[2]).toContain('.transform/4col/');
    // 4. Vector initials avatar
    expect(chain[chain.length - 1]).toContain('data:image/svg+xml');
  });

  it('advances image element src to the next fallback url in the chain without looping', () => {
    const chain = [
      'https://media.formula1.com/current.webp',
      'https://media.formula1.com/previous.webp',
      'https://openf1.org/headshot.png',
      'data:image/svg+xml;utf8,<svg>avatar</svg>'
    ];

    const fakeImg = {
      src: chain[0]
    } as HTMLImageElement;
    const fakeEvent = { target: fakeImg } as unknown as Event;

    // First error: advances to previous season
    service.advanceImageFallback(fakeEvent, chain);
    expect(fakeImg.src).toBe(chain[1]);

    // Second error: advances to OpenF1
    service.advanceImageFallback(fakeEvent, chain);
    expect(fakeImg.src).toBe(chain[2]);

    // Third error: advances to SVG avatar
    service.advanceImageFallback(fakeEvent, chain);
    expect(fakeImg.src).toBe(chain[3]);

    // Fourth error: already at the end of the chain, does not loop or crash
    service.advanceImageFallback(fakeEvent, chain);
    expect(fakeImg.src).toBe(chain[3]);
  });

  it('resolves constructor logo using local branding or Wikidata P154 fallback', async () => {
    // Ferrari is in local branding
    const ferrariLogo = await service.resolveConstructorLogo('ferrari');
    expect(ferrariLogo).toBeDefined();

    // Historic or unknown constructor falls back to Wikidata
    wikidataMock.getTeamLogo.mockResolvedValue('https://commons.wikimedia.org/wiki/Special:FilePath/historic_team_logo.svg?width=500');
    const historicLogo = await service.resolveConstructorLogo('historic_team', 'Historic Racing Team');
    expect(historicLogo).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/historic_team_logo.svg?width=500');
  });
});
