// Nazionalità di Jolpica ("British") → codice paese a 3 lettere come quelli di OpenF1 ("GBR"),
// per mostrare la bandiera quando OpenF1 non ha il paese del pilota
const COUNTRY_CODES: Record<string, string> = {
  American: 'USA',
  Argentine: 'ARG',
  Australian: 'AUS',
  Austrian: 'AUT',
  Belgian: 'BEL',
  Brazilian: 'BRA',
  British: 'GBR',
  Canadian: 'CAN',
  Chinese: 'CHN',
  Colombian: 'COL',
  Danish: 'DEN',
  Dutch: 'NED',
  Estonian: 'EST',
  Finnish: 'FIN',
  French: 'FRA',
  German: 'GER',
  Indian: 'IND',
  Israeli: 'ISR',
  Italian: 'ITA',
  Japanese: 'JPN',
  Mexican: 'MEX',
  Monegasque: 'MON',
  'New Zealander': 'NZL',
  Polish: 'POL',
  Russian: 'RUS',
  Spanish: 'ESP',
  Swedish: 'SWE',
  Swiss: 'SUI',
  Thai: 'THA',
  Venezuelan: 'VEN'
};

export function nationalityToCountryCode(nationality: string): string | undefined {
  return COUNTRY_CODES[nationality];
}
