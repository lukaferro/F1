// Loghi e colori dei costruttori, indicizzati per constructorId di Jolpica.
// Le varianti con il motore nel nome (es. "lotus-climax", "brabham-repco") usano la squadra principale.

const NEUTRAL_COLOR = '666666';

export interface ConstructorLogo {
  url: string;
  // true se il logo è a colori su fondo trasparente e va mostrato su uno sfondo chiaro
  onLight: boolean;
}

// Squadre attuali: logo ufficiale bianco del sito F1, leggibile sul colore della squadra
const F1_LOGO_SLUGS: Record<string, string> = {
  mercedes: 'mercedes',
  ferrari: 'ferrari',
  mclaren: 'mclaren',
  red_bull: 'redbullracing',
  rb: 'racingbulls',
  aston_martin: 'astonmartin',
  alpine: 'alpine',
  williams: 'williams',
  haas: 'haasf1team',
  audi: 'audi',
  cadillac: 'cadillac'
};

// Squadre storiche: logo ufficiale da Wikimedia Commons (proprietà P154 di Wikidata),
// solo file che sono davvero loghi (esclusi foto di motori e stemmi fotografati)
const WIKIMEDIA_LOGOS: Record<string, string> = {
  ats: 'Ats_logo_2009.svg',
  bmw: 'BMW_logo_(gray).svg',
  brp: 'British_Racing_Partnership_logo.png',
  bugatti: 'Bugatti_Logo.png',
  caterham: 'Caterham_F1_Team_logo_(2014).svg',
  dallara: 'Dallara_logo.svg',
  'de_tomaso-alfa_romeo': 'Detomaso_automobili_logo.png',
  'de_tomaso-ferrari': 'Detomaso_automobili_logo.png',
  'de_tomaso-osca': 'Detomaso_automobili_logo.png',
  emw: 'Eisenacher_Motorenwerk.svg',
  gordini: 'Gordini_Logo.svg',
  lago: 'Talbot_Paris_logo.jpg',
  ligier: 'Ligier2017.png',
  'lotus-borgward': 'TeamLotus.jpg',
  'lotus-brm': 'TeamLotus.jpg',
  'lotus-climax': 'TeamLotus.jpg',
  'lotus-ford': 'TeamLotus.jpg',
  'lotus-maserati': 'TeamLotus.jpg',
  'lotus-pw': 'TeamLotus.jpg',
  lotus_f1: 'Lotus_F1_Team_logo.jpg',
  maserati: 'Maserati_logo_2.svg',
  osella: 'Osella.svg',
  penske: 'Team_Penske_logo.svg',
  prost: 'Prost_Grand_Prix_Formula_One_Logo.png',
  racing_point: 'BWT_Racing_Point_Logo.svg',
  sauber: 'Logo_Sauber_F1.png',
  simca: 'Simca_logo_1970.svg',
  stewart: 'Stewart-logo.jpg',
  team_lotus: 'TeamLotus.jpg',
  tomaso: 'Detomaso_automobili_logo.png',
  veritas: 'Veritas_logo.png'
};

// Colori (esadecimale senza #): squadre attuali e recenti, poi storiche con il loro colore tradizionale
const CONSTRUCTOR_COLORS: Record<string, string> = {
  mercedes: '00D7B6',
  ferrari: 'ED1131',
  mclaren: 'F47600',
  red_bull: '4781D7',
  rb: '6C98FF',
  alphatauri: '6C98FF',
  toro_rosso: '469BFF',
  alpine: '00A1E8',
  renault: 'FFF500',
  aston_martin: '229971',
  racing_point: 'F596C8',
  force_india: 'F596C8',
  williams: '1868DB',
  haas: '9C9FA2',
  sauber: '01C00E',
  alfa: 'C92D4B',
  audi: 'F50537',
  cadillac: '909090',
  // storiche
  team_lotus: '00664A',
  lotus: '00664A',
  lotus_racing: '00664A',
  lotus_f1: 'C9A43B',
  brabham: '1E3F8F',
  tyrrell: '0B3D91',
  benetton: '00A651',
  jordan: 'F7D117',
  minardi: 'D9D9D9',
  ligier: '2E6FD8',
  matra: '2E6FD8',
  brm: '1F5C3A',
  cooper: '1B5E20',
  vanwall: '0F5132',
  maserati: 'C8102E',
  lancia: 'B71C1C',
  toyota: 'CC0000',
  honda: 'F04E4E',
  bar: 'BFBFBF',
  brawn: 'D9FF00',
  jaguar: '0B6E4F',
  stewart: 'E8E8E8',
  arrows: 'F28C28',
  footwork: 'D32F2F',
  march: 'F57C00',
  lola: 'C62828',
  surtees: 'D0D0D0',
  shadow: '5A5A5A',
  wolf: '1A237E',
  hesketh: 'EDEDED',
  toleman: '1565C0',
  larrousse: '1976D2',
  prost: '1E40AF',
  super_aguri: 'D50000',
  spyker: 'FF7300',
  spyker_mf1: 'FF7300',
  mf1: 'C62828',
  caterham: '005F3C',
  marussia: 'C8102E',
  manor: 'E2231A',
  hrt: 'A0A0A0',
  virgin: 'D32F2F',
  bmw_sauber: '1E88E5',
  bmw: '1E88E5',
  ensign: '1565C0',
  fittipaldi: 'F9A825',
  penske: 'D32F2F',
  osella: 'C62828',
  zakspeed: '1565C0',
  dallara: 'E53935',
  onyx: '1E88E5',
  leyton: '00A3AD',
  simtek: '6A1B9A',
  pacific: '1E88E5',
  forti: 'F9D71C',
  rial: '1E4FA3',
  ags: 'BDBDBD',
  coloni: 'FFD54F',
  eurobrun: '4FC3F7',
  lds: 'E57373',
  re: '8D6E63',
  parnelli: 'D84315',
  hill: 'D6D6D6',
  lyncar: 'A1887F',
  maki: 'FFB300'
};

// "brabham-repco" -> "brabham"
const baseId = (constructorId: string) => constructorId.split('-')[0];

export function constructorColor(constructorId: string): string {
  return CONSTRUCTOR_COLORS[constructorId] ?? CONSTRUCTOR_COLORS[baseId(constructorId)] ?? NEUTRAL_COLOR;
}

const f1Logo = (slug: string): ConstructorLogo => ({
  url: `https://media.formula1.com/image/upload/c_fit,h_96/q_auto/v1740000000/common/f1/2026/${slug}/2026${slug}logowhite.webp`,
  onLight: false
});

export function constructorLogo(constructorId: string): ConstructorLogo | undefined {
  if (!constructorId) return undefined;
  if (F1_LOGO_SLUGS[constructorId]) return f1Logo(F1_LOGO_SLUGS[constructorId]);
  const file = WIKIMEDIA_LOGOS[constructorId];
  if (file) return { url: `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=160`, onLight: true };
  const base = F1_LOGO_SLUGS[baseId(constructorId)];
  return base ? f1Logo(base) : undefined;
}
