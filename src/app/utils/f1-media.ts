// Immagini ufficiali del sito formula1.com (tracciati e foto piloti) e loghi degli sponsor dei Gran Premi

const F1_MEDIA = 'https://media.formula1.com/image/upload';

// Stagione delle foto/mappe ad alta risoluzione pubblicate sul sito F1
const MEDIA_SEASON = 2026;

// Nome del team (come restituito da OpenF1) -> cartella usata dal sito F1 per le foto dei piloti
const TEAM_SLUGS: Record<string, string> = {
  'Alpine': 'alpine',
  'Aston Martin': 'astonmartin',
  'Audi': 'audi',
  'Cadillac': 'cadillac',
  'Ferrari': 'ferrari',
  'Haas F1 Team': 'haasf1team',
  'McLaren': 'mclaren',
  'Mercedes': 'mercedes',
  'Racing Bulls': 'racingbulls',
  'Red Bull Racing': 'redbullracing',
  'Williams': 'williams'
};

/** Mappa dettagliata del tracciato (settori, curve, zone di sorpasso) a partire dal circuit_short_name di OpenF1 */
export function circuitMapUrl(circuitShortName: string | undefined): string | undefined {
  if (!circuitShortName) return undefined;
  const slug = circuitShortName.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  return `${F1_MEDIA}/c_fit,h_704/q_auto/v1740000000/common/f1/${MEDIA_SEASON}/track/${MEDIA_SEASON}track${slug}detailed.webp`;
}

/** Codice pilota del sito F1 (es. "lewham01") ricavato dall'headshot_url di OpenF1 */
function driverCode(headshotUrl: string | undefined): string | undefined {
  return headshotUrl?.match(/\/(\w+)\.png\.transform/)?.[1];
}

/**
 * Foto ufficiale ad alta risoluzione della stagione corrente.
 * Va chiamata con i dati del pilota nella stagione attuale (team attuale), altrimenti il link non esiste.
 */
export function currentSeasonPhotoUrl(driver: { team_name?: string; headshot_url?: string }): string | undefined {
  const slug = TEAM_SLUGS[driver.team_name ?? ''];
  const code = driverCode(driver.headshot_url);
  if (!slug || !code) return undefined;
  return `${F1_MEDIA}/c_lfill,g_north,w_440,h_520/q_auto/v1740000000/common/f1/${MEDIA_SEASON}/${slug}/${code}/${MEDIA_SEASON}${slug}${code}right.webp`;
}

/** L'headshot_url di OpenF1 è una miniatura (1col): chiediamo la versione più grande */
export function hiResHeadshotUrl(headshotUrl: string | undefined): string | undefined {
  return headshotUrl?.replace('.transform/1col/', '.transform/4col/');
}

export interface SponsorInfo {
  name: string;
  logo: string;
  website?: string;
}

const wikimediaLogo = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=400`;

// Title sponsor che compaiono nel nome ufficiale dei Gran Premi (meeting_official_name)
const TITLE_SPONSORS: { match: string; info: SponsorInfo }[] = [
  { match: 'ARAMCO', info: { name: 'Aramco', logo: wikimediaLogo('Saudi_aramco_logo.svg'), website: 'https://www.aramco.com' } },
  { match: 'AWS', info: { name: 'AWS', logo: wikimediaLogo('Amazon_Web_Services_Logo.svg'), website: 'https://aws.amazon.com/f1/' } },
  { match: 'CRYPTO.COM', info: { name: 'Crypto.com', logo: 'https://mkt-site-asset.crypto.com/assets/logo/crypto-com.svg', website: 'https://crypto.com' } },
  { match: 'ETIHAD AIRWAYS', info: { name: 'Etihad Airways', logo: wikimediaLogo('Etihad-airways-logo.svg'), website: 'https://www.etihad.com' } },
  { match: 'GULF AIR', info: { name: 'Gulf Air', logo: wikimediaLogo('Gulf_Air_2001_wordmark.svg'), website: 'https://www.gulfair.com' } },
  { match: 'HARD ROCK', info: { name: 'Hard Rock', logo: wikimediaLogo('Hard_Rock_Cafe_Logo.svg'), website: 'https://www.hardrock.com' } },
  { match: 'HEINEKEN', info: { name: 'Heineken', logo: wikimediaLogo('Heineken_logo.svg'), website: 'https://www.heineken.com' } },
  { match: 'LENOVO', info: { name: 'Lenovo', logo: wikimediaLogo('Lenovo_Logo.svg'), website: 'https://www.lenovo.com' } },
  { match: 'LOUIS VUITTON', info: { name: 'Louis Vuitton', logo: wikimediaLogo('Louis_Vuitton_logo_and_wordmark.svg'), website: 'https://www.louisvuitton.com' } },
  { match: 'MOËT & CHANDON', info: { name: 'Moët & Chandon', logo: wikimediaLogo('Logo_Mo%C3%ABt_%26_Chandon.svg'), website: 'https://www.moet.com' } },
  { match: 'MSC CRUISES', info: { name: 'MSC Crociere', logo: wikimediaLogo('MSC_Cruises_Logo.png'), website: 'https://www.msccrociere.it' } },
  { match: 'PIRELLI', info: { name: 'Pirelli', logo: wikimediaLogo('Pirelli_-_logo_full_(Italy%2C_1997).svg'), website: 'https://www.pirelli.com' } },
  { match: 'QATAR AIRWAYS', info: { name: 'Qatar Airways', logo: wikimediaLogo('Qatar_Airways_logo.svg'), website: 'https://www.qatarairways.com' } },
  { match: 'ROLEX', info: { name: 'Rolex', logo: wikimediaLogo('Logo_da_Rolex.png'), website: 'https://www.rolex.com' } },
  { match: 'SINGAPORE AIRLINES', info: { name: 'Singapore Airlines', logo: wikimediaLogo('Singapore_Airlines_Logo.svg'), website: 'https://www.singaporeair.com' } },
  { match: 'STC', info: { name: 'stc', logo: wikimediaLogo('STC-01.svg'), website: 'https://www.stc.com.sa' } },
  { match: 'TAG HEUER', info: { name: 'TAG Heuer', logo: wikimediaLogo('TAG_HEUER_logo.svg'), website: 'https://www.tagheuer.com' } }
];

/** Title sponsor del Gran Premio letto dal nome ufficiale (es. "FORMULA 1 LOUIS VUITTON AUSTRALIAN GRAND PRIX 2025") */
export function titleSponsor(meetingOfficialName: string | undefined): SponsorInfo | undefined {
  if (!meetingOfficialName) return undefined;
  // Lo sponsor sta subito dopo "FORMULA 1": cerchiamo solo lì per evitare falsi positivi (es. "QATAR" nel nome del GP)
  const afterF1 = meetingOfficialName.toUpperCase().split('FORMULA 1')[1]?.trim() ?? '';
  return TITLE_SPONSORS.find(s => afterF1.startsWith(s.match + ' '))?.info;
}
