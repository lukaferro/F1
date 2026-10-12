import { nationalityToCountryCode } from './nationality';

describe('nationalityToCountryCode', () => {
  it('maps Jolpica nationalities to country codes', () => {
    expect(nationalityToCountryCode('British')).toBe('GBR');
    expect(nationalityToCountryCode('Monegasque')).toBe('MON');
    expect(nationalityToCountryCode('New Zealander')).toBe('NZL');
  });

  it('returns undefined for an unknown nationality', () => {
    expect(nationalityToCountryCode('Martian')).toBeUndefined();
  });
});
