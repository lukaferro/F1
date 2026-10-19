import { flagUrl, countryNameToCode } from './country-flags';

describe('flagUrl', () => {
  it('turns a three-letter country code into a flag image', () => {
    expect(flagUrl('GBR')).toBe('https://flagcdn.com/w320/gb.png');
  });

  it('knows the flags of historic countries', () => {
    expect(flagUrl('RHO')).toBe('https://flagcdn.com/w320/zw.png');
    expect(flagUrl('GDR')).toBe('https://flagcdn.com/w320/de.png');
    expect(flagUrl('MAR')).toBe('https://flagcdn.com/w320/ma.png');
  });

  it('returns an empty string without a code', () => {
    expect(flagUrl(undefined)).toBe('');
  });

  it('lowercases an unknown code', () => {
    expect(flagUrl('XYZ')).toBe('https://flagcdn.com/w320/xyz.png');
  });
});

describe('countryNameToCode', () => {
  it('maps common circuit countries to 3-letter codes', () => {
    expect(countryNameToCode('Italy')).toBe('ITA');
    expect(countryNameToCode('UK')).toBe('GBR');
    expect(countryNameToCode('Great Britain')).toBe('GBR');
    expect(countryNameToCode('United States')).toBe('USA');
    expect(countryNameToCode('USA')).toBe('USA');
    expect(countryNameToCode('Morocco')).toBe('MAR');
    expect(countryNameToCode('Brazil')).toBe('BRA');
    expect(countryNameToCode('Monaco')).toBe('MON');
  });

  it('returns empty string for undefined or unknown country', () => {
    expect(countryNameToCode(undefined)).toBe('');
    expect(countryNameToCode('')).toBe('');
  });
});

