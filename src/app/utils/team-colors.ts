// Colori di riserva dei team (esadecimale senza #), usati solo se l'API non fornisce team_colour
export const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '4781D7',
  'Mercedes': '00D7B6',
  'Ferrari': 'ED1131',
  'McLaren': 'F47600',
  'Aston Martin': '229971',
  'Alpine': '00A1E8',
  'AlphaTauri': '6C98FF',
  'RB': '6692FF',
  'Racing Bulls': '6C98FF',
  'Alfa Romeo': 'C92D4B',
  'Kick Sauber': '01C00E',
  'Haas F1 Team': '9C9FA2',
  'Williams': '1868DB',
  'Audi': 'F50537',
  'Cadillac': '909090'
};

// Colori per costruttore indicizzati per constructorId di Jolpica (esadecimale senza #).
// Le squadre storiche non elencate usano il grigio neutro scelto da chi le mostra.
export const CONSTRUCTOR_COLORS: Record<string, string> = {
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
  cadillac: '909090'
};
