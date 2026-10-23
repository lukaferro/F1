/**
 * Coordinate e geometrie vettoriali per la Vista Mappa Geografica & Calendario Mondiale F1.
 * Proiezione Equirettangolare (Plate Carrée): width = 1000, height = 500.
 */

export interface GeoPoint {
  x: number;
  y: number;
}

export interface CircuitDisplayPoint extends GeoPoint {
  trueX: number;
  trueY: number;
  isOffset: boolean;
}

export type MacroRegionId = 'world' | 'europe' | 'americas' | 'middle_east' | 'asia_pacific';

export interface MacroRegionInfo {
  id: MacroRegionId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  viewBox: string;
  description: string;
}

export const MACRO_REGIONS: MacroRegionInfo[] = [
  {
    id: 'world',
    label: 'Tutto il Mondo',
    shortLabel: 'Mondo',
    icon: 'pi pi-globe',
    color: '#ffffff',
    viewBox: '0 0 1000 500',
    description: 'Tutti i 24 circuiti ufficiali del Campionato Mondiale FIA Formula 1.'
  },
  {
    id: 'europe',
    label: 'Tour Europeo',
    shortLabel: 'Europa',
    icon: 'pi pi-compass',
    color: '#e10600',
    viewBox: '470 85 110 70',
    description: 'La culla della F1: Monza, Spa, Silverstone, Monaco, Imola, Barcellona, Spielberg, Budapest e Zandvoort.'
  },
  {
    id: 'americas',
    label: 'Le Americhe',
    shortLabel: 'Americhe',
    icon: 'pi pi-map',
    color: '#38bdf8',
    viewBox: '130 90 310 270',
    description: 'La trasferta atlantica: Montreal, Miami, Austin COTA, Las Vegas, Città del Messico e Interlagos.'
  },
  {
    id: 'middle_east',
    label: 'Medio Oriente & Golfo',
    shortLabel: 'Medio Oriente',
    icon: 'pi pi-sun',
    color: '#f59e0b',
    viewBox: '595 155 75 50',
    description: 'I giganti del Golfo: Sakhir Bahrain, Jeddah Corniche, Lusail Qatar e il gran finale a Yas Marina Abu Dhabi.'
  },
  {
    id: 'asia_pacific',
    label: 'Asia & Pacifico',
    shortLabel: 'Asia & Pacifico',
    icon: 'pi pi-sparkles',
    color: '#10b981',
    viewBox: '710 90 280 290',
    description: 'Dalle notturne di Singapore e Baku alle sfide storiche di Suzuka, Shanghai e Melbourne Albert Park.'
  }
];

/**
 * Converte coordinate geografiche (lat, lng) in coordinate SVG nello spazio 1000x500.
 */
export function geoToSvg(lat: number, lng: number, width = 1000, height = 500): GeoPoint {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10
  };
}

/**
 * Offset calibrati per la vista globale (0 0 1000 500) per evitare
 * che circuiti geograficamente vicini (es. Silverstone, Zandvoort, Spa, Monza, Monaco, Imola, Spielberg, Budapest, Bahrain, Lusail)
 * si accavallino rendendo difficile l'interazione.
 * Nella vista regionale (zoom) questi offset non vengono applicati (valori reali 1:1).
 */
export const GLOBAL_VIEW_OFFSETS: Record<string, { dx: number; dy: number }> = {
  // Europa: sventaglio radiale con distanze minime di sicurezza
  silverstone: { dx: -12, dy: -8 },
  zandvoort: { dx: -6, dy: -12 },
  spa: { dx: 4, dy: -7 },
  barcelona: { dx: -10, dy: 8 },
  monaco: { dx: -10, dy: 9 },
  monza: { dx: 6, dy: -7 },
  imola: { dx: 10, dy: 12 },
  'red-bull-ring': { dx: 5, dy: -10 },
  spielberg: { dx: 5, dy: -10 },
  hungaroring: { dx: 12, dy: 2 },
  budapest: { dx: 12, dy: 2 },

  // Medio Oriente
  bahrain: { dx: -8, dy: -6 },
  lusail: { dx: 8, dy: 6 },
  'yas-marina': { dx: 8, dy: -6 },
  yas_marina: { dx: 8, dy: -6 }
};

/**
 * Calcola la posizione su schermo di un circuito:
 * se in vista globale applica gli offset di decluttering, altrimenti restituisce la posizione reale.
 */
export function getCircuitDisplayCoords(
  circuit: { id: string; latitude?: number; longitude?: number },
  isGlobalView = true
): CircuitDisplayPoint {
  if (typeof circuit.latitude !== 'number' || typeof circuit.longitude !== 'number') {
    return { x: 500, y: 250, trueX: 500, trueY: 250, isOffset: false };
  }
  const truePos = geoToSvg(circuit.latitude, circuit.longitude);
  if (!isGlobalView) {
    return { x: truePos.x, y: truePos.y, trueX: truePos.x, trueY: truePos.y, isOffset: false };
  }
  const offset = GLOBAL_VIEW_OFFSETS[circuit.id];
  if (!offset) {
    return { x: truePos.x, y: truePos.y, trueX: truePos.x, trueY: truePos.y, isOffset: false };
  }
  return {
    x: Math.round((truePos.x + offset.dx) * 10) / 10,
    y: Math.round((truePos.y + offset.dy) * 10) / 10,
    trueX: truePos.x,
    trueY: truePos.y,
    isOffset: true
  };
}

/**
 * Tracciati vettoriali semplificati dei continenti in proiezione equirettangolare (1000x500).
 */
export const CONTINENT_PATHS: { id: string; name: string; d: string }[] = [
  // Nord America
  {
    id: 'north-america',
    name: 'Nord America',
    d: `M 32 68
        L 52 58 L 84 64 L 118 52 L 152 48 L 198 52 L 236 50 L 268 56 L 314 62 L 342 82
        L 348 102 L 328 116 L 302 124 L 292 148 L 284 178 L 278 198 L 284 218 L 274 232
        L 258 226 L 246 206 L 228 192 L 196 188 L 176 182 L 162 168 L 150 142 L 140 114
        L 110 92 L 72 88 L 38 84 Z`
  },
  // Groenlandia
  {
    id: 'greenland',
    name: 'Groenlandia',
    d: `M 370 42 L 418 36 L 436 54 L 412 84 L 382 78 L 366 58 Z`
  },
  // Sud America
  {
    id: 'south-america',
    name: 'Sud America',
    d: `M 284 226
        L 308 220 L 334 234 L 368 244 L 392 268 L 398 298 L 382 338 L 354 378 L 332 418
        L 322 444 L 312 434 L 310 388 L 300 338 L 286 298 L 274 258 L 278 234 Z`
  },
  // Europa continentale
  {
    id: 'europe',
    name: 'Europa',
    d: `M 470 174
        L 476 158 L 484 148 L 490 134 L 480 124 L 484 110 L 500 98 L 524 84 L 544 68
        L 570 74 L 564 94 L 548 108 L 558 124 L 574 128 L 584 144 L 558 154 L 538 148
        L 524 158 L 508 164 L 494 178 L 474 178 Z`
  },
  // Scandinavia
  {
    id: 'scandinavia',
    name: 'Scandinavia',
    d: `M 512 68 L 532 48 L 556 48 L 562 68 L 546 94 L 526 88 L 516 78 Z`
  },
  // Gran Bretagna e Irlanda
  {
    id: 'british-isles',
    name: 'Isole Britanniche',
    d: `M 464 108 L 476 98 L 480 108 L 476 124 L 468 128 L 460 118 Z
        M 452 114 L 460 110 L 462 122 L 454 124 Z`
  },
  // Africa
  {
    id: 'africa',
    name: 'Africa',
    d: `M 474 184
        L 504 180 L 534 184 L 568 194 L 588 198 L 608 224 L 614 254 L 584 294 L 564 338
        L 548 374 L 528 384 L 514 364 L 504 318 L 494 278 L 478 258 L 454 244 L 448 214
        L 464 194 Z`
  },
  // Madagascar
  {
    id: 'madagascar',
    name: 'Madagascar',
    d: `M 618 318 L 626 312 L 632 342 L 624 354 L 616 338 Z`
  },
  // Asia (incluso Medio Oriente, India, Cina, Russia)
  {
    id: 'asia',
    name: 'Asia',
    d: `M 570 74
        L 610 64 L 660 58 L 720 54 L 780 48 L 840 54 L 890 64 L 920 78 L 910 108 L 880 118
        L 860 138 L 834 168 L 804 204 L 774 228 L 754 244 L 738 218 L 718 198 L 688 194
        L 664 208 L 638 234 L 628 208 L 608 198 L 584 194 L 574 164 L 584 144 L 568 128
        L 548 108 L 564 94 Z`
  },
  // Giappone
  {
    id: 'japan',
    name: 'Giappone',
    d: `M 874 138 L 886 128 L 892 144 L 882 158 L 872 152 Z`
  },
  // Sud-est Asiatico / Indonesia
  {
    id: 'southeast-asia',
    name: 'Sud-est Asiatico & Indonesia',
    d: `M 780 248 L 804 252 L 814 268 L 794 274 L 774 258 Z
        M 816 270 L 844 268 L 852 284 L 828 288 Z
        M 854 254 L 872 258 L 868 274 L 850 268 Z`
  },
  // Australia
  {
    id: 'australia',
    name: 'Australia',
    d: `M 818 308
        L 854 298 L 884 304 L 904 328 L 908 364 L 894 384 L 868 394 L 834 388 L 808 368
        L 804 338 L 814 318 Z`
  },
  // Nuova Zelanda
  {
    id: 'new-zealand',
    name: 'Nuova Zelanda',
    d: `M 952 408 L 962 402 L 958 424 L 948 428 Z
        M 942 430 L 952 428 L 946 450 L 938 448 Z`
  }
];

/**
 * Linee guida del reticolo geografico (Equatore, Tropici, Meridiani principali).
 */
export const GRID_LINES: { label: string; d: string }[] = [
  // Equatore (lat 0 -> y 250)
  { label: 'Equatore', d: 'M 0 250 L 1000 250' },
  // Tropico del Cancro (lat +23.4° -> y 185)
  { label: 'Tropico del Cancro', d: 'M 0 185 L 1000 185' },
  // Tropico del Capricorno (lat -23.4° -> y 315)
  { label: 'Tropico del Capricorno', d: 'M 0 315 L 1000 315' },
  // Meridiano di Greenwich (lng 0 -> x 500)
  { label: 'Meridiano di Greenwich', d: 'M 500 0 L 500 500' }
];

export interface CircuitMapTarget {
  id: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  round_number?: number;
}

/**
 * Genera la stringa SVG path 'd' che collega i 24 Gran Premi in ordine di round stagionale.
 */
export function generateFlightPath(circuits: CircuitMapTarget[], isGlobalView = true): string {
  const ordered = [...circuits]
    .filter(c => typeof c.latitude === 'number' && typeof c.longitude === 'number' && typeof c.round_number === 'number')
    .sort((a, b) => (a.round_number || 0) - (b.round_number || 0));

  if (ordered.length < 2) return '';

  const points = ordered.map(c => getCircuitDisplayCoords(c, isGlobalView));
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    // Se attraversa il meridiano 180° evita una riga che taglia tutto il planisfero
    if (Math.abs(dx) > 600) {
      d += ` M ${p2.x} ${p2.y}`;
      continue;
    }

    const midX = (p1.x + p2.x) / 2;
    const dy = p2.y - p1.y;
    // Curvatura ad arco proporzionale alla distanza orizzontale
    const curvature = Math.min(30, Math.max(10, Math.abs(dx) * 0.1));
    const midY = (p1.y + p2.y) / 2 - curvature;

    d += ` Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${p2.x} ${p2.y}`;
  }

  return d;
}
