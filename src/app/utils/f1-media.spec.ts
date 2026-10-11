import { circuitMapUrl, currentSeasonPhotoUrl, hiResHeadshotUrl, titleSponsor } from './f1-media';

describe('f1-media', () => {
  describe('titleSponsor', () => {
    it('reads the sponsor right after "FORMULA 1"', () => {
      expect(titleSponsor('FORMULA 1 LOUIS VUITTON AUSTRALIAN GRAND PRIX 2025')?.name).toBe('Louis Vuitton');
      expect(titleSponsor('FORMULA 1 MSC CRUISES GRAN PREMIO DE BARCELONA-CATALUNYA 2026')?.name).toBe('MSC Crociere');
    });

    it('does not mistake the country in the GP name for a sponsor', () => {
      expect(titleSponsor('FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2025')?.name).toBe('Qatar Airways');
      expect(titleSponsor('FORMULA 1 GRAN PREMIO DE LA CIUDAD DE MÉXICO 2025')).toBeUndefined();
    });

    it('works for called-off events too', () => {
      expect(titleSponsor("CALLED OFF: FORMULA 1 QATAR AIRWAYS GRAN PREMIO DEL MADE IN ITALY E DELL'EMILIA-ROMAGNA 2023")?.name).toBe('Qatar Airways');
    });
  });

  it('builds the detailed track map from the circuit short name', () => {
    expect(circuitMapUrl('Spa-Francorchamps')).toContain('2026trackspafrancorchampsdetailed.webp');
    expect(circuitMapUrl('Monte Carlo')).toContain('2026trackmontecarlodetailed.webp');
    expect(circuitMapUrl(undefined)).toBeUndefined();
  });

  it('builds the current-season photo from team and headshot code', () => {
    const headshot = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png';
    expect(currentSeasonPhotoUrl({ team_name: 'McLaren', headshot_url: headshot })).toContain('/mclaren/lannor01/2026mclarenlannor01right.webp');
    expect(currentSeasonPhotoUrl({ team_name: 'Unknown Team', headshot_url: headshot })).toBeUndefined();
    expect(hiResHeadshotUrl(headshot)).toContain('.transform/4col/');
  });
});
