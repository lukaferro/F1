import { constructorColor, constructorLogo } from './constructor-branding';

describe('constructor branding', () => {
  describe('constructorLogo', () => {
    it('uses the official F1 logo for current teams', () => {
      expect(constructorLogo('ferrari')?.url).toContain('/common/f1/2026/ferrari/2026ferrarilogowhite.webp');
      expect(constructorLogo('red_bull')?.url).toContain('/redbullracing/2026redbullracinglogowhite.webp');
      expect(constructorLogo('ferrari')?.onLight).toBe(false);
    });

    it('uses the Wikimedia logo for historic constructors that have one', () => {
      const lotus = constructorLogo('lotus-climax');
      expect(lotus?.url).toContain('commons.wikimedia.org/wiki/Special:FilePath/');
      expect(lotus?.onLight).toBe(true);
    });

    it('falls back to the current team logo for engine variants of a current team', () => {
      expect(constructorLogo('williams')?.url).toContain('2026williamslogowhite');
    });

    it('returns nothing for constructors without a known logo', () => {
      expect(constructorLogo('tyrrell')).toBeUndefined();
      expect(constructorLogo('')).toBeUndefined();
    });
  });

  describe('constructorColor', () => {
    it('knows historic teams', () => {
      expect(constructorColor('brabham')).not.toBe('666666');
      expect(constructorColor('tyrrell')).not.toBe('666666');
      expect(constructorColor('jordan')).not.toBe('666666');
    });

    it('gives engine variants the colour of the main team', () => {
      expect(constructorColor('brabham-repco')).toBe(constructorColor('brabham'));
      expect(constructorColor('lotus-climax')).toBe(constructorColor('team_lotus'));
      expect(constructorColor('mclaren-ford')).toBe(constructorColor('mclaren'));
    });

    it('uses neutral grey for unknown constructors', () => {
      expect(constructorColor('scirocco')).toBe('666666');
    });
  });
});
