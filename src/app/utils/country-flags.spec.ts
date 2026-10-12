import { flagUrl } from './country-flags';

describe('flagUrl', () => {
  it('turns a three-letter country code into a flag image', () => {
    expect(flagUrl('GBR')).toBe('https://flagcdn.com/w320/gb.png');
  });

  it('knows the flags of historic countries', () => {
    expect(flagUrl('RHO')).toBe('https://flagcdn.com/w320/zw.png');
    expect(flagUrl('GDR')).toBe('https://flagcdn.com/w320/de.png');
  });

  it('returns an empty string without a code', () => {
    expect(flagUrl(undefined)).toBe('');
  });

  it('lowercases an unknown code', () => {
    expect(flagUrl('XYZ')).toBe('https://flagcdn.com/w320/xyz.png');
  });
});
