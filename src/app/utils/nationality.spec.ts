import { nationalityToCountryCode } from './nationality';

describe('nationalityToCountryCode', () => {
  it('maps Jolpica nationalities to country codes', () => {
    expect(nationalityToCountryCode('British')).toBe('GBR');
    expect(nationalityToCountryCode('Monegasque')).toBe('MON');
    expect(nationalityToCountryCode('New Zealander')).toBe('NZL');
  });

  it('maps historic nationalities', () => {
    expect(nationalityToCountryCode('Rhodesian')).toBe('RHO');
    expect(nationalityToCountryCode('East German')).toBe('GDR');
    expect(nationalityToCountryCode('Uruguayan')).toBe('URU');
    expect(nationalityToCountryCode('South African')).toBe('RSA');
    expect(nationalityToCountryCode('Liechtensteiner')).toBe('LIE');
  });

  it('returns undefined for an unknown nationality', () => {
    expect(nationalityToCountryCode('Martian')).toBeUndefined();
  });
});
