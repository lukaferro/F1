// Bandiere dei paesi: codice a 3 lettere (OpenF1, o ricavato dalla nazionalità Jolpica) → immagine flagcdn
const COUNTRY_CODES: Record<string, string> = {
  BRN: 'bh',
  KSA: 'sa',
  AUS: 'au',
  JPN: 'jp',
  CHN: 'cn',
  USA: 'us',
  ITA: 'it',
  MON: 'mc',
  CAN: 'ca',
  ESP: 'es',
  AUT: 'at',
  GBR: 'gb',
  HUN: 'hu',
  BEL: 'be',
  NED: 'nl',
  AZE: 'az',
  SGP: 'sg',
  MEX: 'mx',
  BRA: 'br',
  UAE: 'ae',
  QAT: 'qa',
  FRA: 'fr',
  DEU: 'de',
  GER: 'de',
  RUS: 'ru',
  PRT: 'pt',
  TUR: 'tr',
  MYS: 'my',
  JOR: 'jo',
  KOR: 'kr',
  IND: 'in',
  ZAF: 'za',
  ABU: 'ae',
  ARG: 'ar',
  BAH: 'bh',
  SIN: 'sg',
  JAP: 'jp',
  MAL: 'my',
  EUR: 'eu',
  STY: 'at',
  EMI: 'it',
  TUS: 'it',
  POR: 'pt',
  LUX: 'lu',
  MIA: 'us',
  LAS: 'us',
  TEX: 'us',
  CAT: 'es',
  SPA: 'be',
  EIF: 'de',
  MUG: 'it',
  AZB: 'az',
  DEN: 'dk',  // Danimarca
  DNK: 'dk',  // Danimarca (alternativo)
  FIN: 'fi',  // Finlandia
  THA: 'th',  // Tailandia
  NZL: 'nz',  // Nuova Zelanda
  POL: 'pl',  // Polonia
  SWE: 'se',  // Svezia
  CHE: 'ch',  // Svizzera
  SUI: 'ch',  // Svizzera (alternativo)
  NOR: 'no',  // Norvegia
  CZE: 'cz',  // Repubblica Ceca
  VEN: 've',  // Venezuela
  COL: 'co',  // Colombia
  EST: 'ee',  // Estonia
  ISR: 'il',  // Israele
  RSA: 'za',  // Sudafrica
  IRL: 'ie',  // Irlanda
  URU: 'uy',  // Uruguay
  RHO: 'zw',  // Rhodesia (oggi Zimbabwe)
  GDR: 'de',  // Germania Est
  INA: 'id',  // Indonesia
  CHI: 'cl',  // Cile
  MAS: 'my',  // Malesia
  LIE: 'li'   // Liechtenstein
};

export function flagUrl(countryCode: string | undefined): string {
  if (!countryCode) return '';
  const iso2 = COUNTRY_CODES[countryCode] || countryCode.toLowerCase();
  return `https://flagcdn.com/w320/${iso2}.png`;
}
