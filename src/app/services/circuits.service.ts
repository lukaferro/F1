import { Injectable } from '@angular/core';
import { Circuit } from '../models/circuit';

@Injectable({
  providedIn: 'root'
})
export class CircuitsService {
  private circuits: Circuit[] = [
    {
      id: 'monza',
      name: 'Autodromo Nazionale di Monza',
      location: 'Monza',
      country: 'Italia',
      country_code: 'IT',
      continent: 'Europa',
      gp_circuit_filter: 'Monza',
      length_km: 5.793,
      turns: 11,
      first_grand_prix: 1950,
      lap_record: {
        time: '1:21.046',
        driver: 'Rubens Barrichello',
        year: 2004
      },
      description: 'Il Tempio della Velocità, uno dei circuiti più veloci e iconici del calendario F1. Caratterizzato da lunghi rettilinei e curve paraboliche ad alta velocità.',
      history: 'Inaugurato nel 1922, Monza è il circuito più antico ancora in uso nel calendario F1. Ha ospitato il Gran Premio d\'Italia ininterrottamente dal 1950, ad eccezione del 1980. Il circuito è stato teatro delle battaglie più epiche della storia della Formula 1.',
      memorable_moment: 'Nel 2020, Pierre Gasly conquista la sua prima vittoria in carriera con AlphaTauri in una gara caotica, segnando uno dei momenti più emozionanti della stagione.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackmonzadetailed.webp'
    },
    {
      id: 'spa',
      name: 'Circuit de Spa-Francorchamps',
      location: 'Spa',
      country: 'Belgio',
      country_code: 'BE',
      continent: 'Europa',
      gp_circuit_filter: 'Spa-Francorchamps',
      length_km: 7.004,
      turns: 19,
      first_grand_prix: 1950,
      lap_record: {
        time: '1:46.286',
        driver: 'Valtteri Bottas',
        year: 2018
      },
      description: 'Il circuito più lungo del calendario, celebre per la leggendaria curva Eau Rouge-Raidillon. Conosciuto per le condizioni meteo imprevedibili.',
      history: 'Spa è considerato uno dei circuiti più belli e impegnativi al mondo. La sua combinazione unica di velocità, dislivelli e condizioni meteo variabili lo rendono una sfida completa per i piloti.',
      memorable_moment: 'La rimonta di Michael Schumacher nel 1995 dalla 16ª posizione alla vittoria su pista bagnata è entrata nella leggenda della Formula 1.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Spa-Francorchamps',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackspafrancorchampsdetailed.webp'
    },
    {
      id: 'monaco',
      name: 'Circuit de Monaco',
      location: 'Monte Carlo',
      country: 'Monaco',
      country_code: 'MC',
      continent: 'Europa',
      gp_circuit_filter: 'Monte Carlo',
      length_km: 3.337,
      turns: 19,
      first_grand_prix: 1950,
      lap_record: {
        time: '1:12.909',
        driver: 'Lewis Hamilton',
        year: 2021
      },
      description: 'Il circuito cittadino più prestigioso e iconico della F1. Caratterizzato da strade strette, curve cieche e mancanza di vie di fuga.',
      history: 'Monaco è sinonimo di glamour e prestigio. Vincere qui è considerato l\'apice della carriera di un pilota. Il circuito è rimasto sostanzialmente invariato dal 1929.',
      memorable_moment: 'Il difesa leggendaria di Ayrton Senna negli ultimi giri del GP di Monaco 1992 contro la Williams nettamente più veloce di Nigel Mansell.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Monaco',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackmontecarlodetailed.webp'
    },
    {
      id: 'silverstone',
      name: 'Silverstone Circuit',
      location: 'Silverstone',
      country: 'Regno Unito',
      country_code: 'GB',
      continent: 'Europa',
      gp_circuit_filter: 'Silverstone',
      length_km: 5.891,
      turns: 18,
      first_grand_prix: 1950,
      lap_record: {
        time: '1:27.097',
        driver: 'Max Verstappen',
        year: 2020
      },
      description: 'La casa del motorsport britannico, con curve ad alta velocità come Maggots, Becketts e Copse. Teatro di battaglie epiche.',
      history: 'Silverstone ha ospitato la prima gara del Mondiale di Formula 1 nel 1950. Ex aeroporto militare, è diventato uno dei circuiti più amati dai piloti per le sue curve veloci e fluide.',
      memorable_moment: 'La nona vittoria record di Lewis Hamilton davanti al pubblico di casa nel 2024 sotto condizioni meteo mutevoli.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Silverstone',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026tracksilverstonedetailed.webp'
    },
    {
      id: 'suzuka',
      name: 'Suzuka International Racing Course',
      location: 'Suzuka',
      country: 'Giappone',
      country_code: 'JP',
      continent: 'Asia',
      gp_circuit_filter: 'Suzuka',
      length_km: 5.807,
      turns: 18,
      first_grand_prix: 1987,
      lap_record: {
        time: '1:30.983',
        driver: 'Lewis Hamilton',
        year: 2019
      },
      description: 'L\'unico circuito a forma di "8" del calendario. Celebre per la curva 130R, le Esses e il complesso di Spoon Curve.',
      history: 'Progettato dall\'olandese John Hugenholtz, Suzuka è considerato uno dei circuiti più tecnici e completi. È stato teatro di numerosi titoli mondiali decisi all\'ultima gara.',
      memorable_moment: 'Le storiche sfide tra Ayrton Senna e Alain Prost tra il 1988 e il 1990 che assegnarono tre campionati del mondo consecutivi.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Suzuka_International_Racing_Course',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026tracksuzukadetailed.webp'
    },
    {
      id: 'interlagos',
      name: 'Autódromo José Carlos Pace',
      location: 'San Paolo',
      country: 'Brasile',
      country_code: 'BR',
      continent: 'Americhe',
      gp_circuit_filter: 'Interlagos',
      length_km: 4.309,
      turns: 15,
      first_grand_prix: 1973,
      lap_record: {
        time: '1:10.540',
        driver: 'Valtteri Bottas',
        year: 2018
      },
      description: 'Circuito in senso antiorario con dislivelli pronunciati. Noto per l\'atmosfera elettrica e le gare imprevedibili sotto la pioggia.',
      history: 'Intitolato al pilota brasiliano José Carlos Pace, Interlagos ha ospitato alcuni dei finali di stagione più drammatici della storia della F1.',
      memorable_moment: 'La vittoria eroica di Ayrton Senna nel 1991, la sua prima in casa, conquistata negli ultimi giri con il cambio bloccato in sesta marcia.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackinterlagosdetailed.webp'
    },
    {
      id: 'yas-marina',
      name: 'Yas Marina Circuit',
      location: 'Abu Dhabi',
      country: 'Emirati Arabi Uniti',
      country_code: 'AE',
      continent: 'Medio Oriente',
      gp_circuit_filter: 'Yas Marina Circuit',
      length_km: 5.281,
      turns: 16,
      first_grand_prix: 2009,
      lap_record: {
        time: '1:26.103',
        driver: 'Max Verstappen',
        year: 2021
      },
      description: 'Circuito moderno che attraversa lo spettacolare hotel W, con una gara che parte al tramonto e si conclude sotto i riflettori.',
      history: 'Inaugurato nel 2009 sull\'isola di Yas, è diventato l\'appuntamento conclusivo fisso del Mondiale. Il tracciato è stato velocizzato nel 2021 per favorire i sorpassi.',
      memorable_moment: 'L\'ultimo giro del GP di Abu Dhabi 2021, in cui Max Verstappen ha superato Lewis Hamilton conquistando il suo primo titolo mondiale.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Yas_Marina_Circuit',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackyasmarinacircuitdetailed.webp'
    },
    {
      id: 'melbourne',
      name: 'Albert Park Circuit',
      location: 'Melbourne',
      country: 'Australia',
      country_code: 'AU',
      continent: 'Oceania',
      gp_circuit_filter: 'Melbourne',
      length_km: 5.278,
      turns: 14,
      first_grand_prix: 1996,
      lap_record: {
        time: '1:19.813',
        driver: 'Charles Leclerc',
        year: 2024
      },
      description: 'Circuito cittadino veloce immerso nel parco attorno al lago di Albert Park, storicamente sede della gara inaugurale della stagione.',
      history: 'Melbourne ha sostituito Adelaide come sede del GP d\'Australia nel 1996. Ridisegnato nel 2022 per aumentare la velocità media e le opportunità di sorpasso.',
      memorable_moment: 'La doppietta Ferrari nel 2024 guidata da Carlos Sainz appena due settimane dopo un intervento chirurgico d\'urgenza.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Albert_Park',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackmelbournedetailed.webp'
    },
    {
      id: 'bahrain',
      name: 'Bahrain International Circuit',
      location: 'Sakhir',
      country: 'Bahrain',
      country_code: 'BH',
      continent: 'Medio Oriente',
      gp_circuit_filter: 'Sakhir',
      length_km: 5.412,
      turns: 15,
      first_grand_prix: 2004,
      lap_record: {
        time: '1:31.447',
        driver: 'Pedro de la Rosa',
        year: 2005
      },
      description: 'Tracciato nel deserto di Sakhir caratterizzato da forti staccate, lunghi rettilinei e asfalto abrasivo che mette a dura prova le gomme.',
      history: 'Primo circuito del Medio Oriente ad ospitare la Formula 1 nel 2004. Dal 2014 la gara si disputa in notturna sotto un imponente impianto di illuminazione.',
      memorable_moment: 'Il "Duello nel Deserto" del 2014 tra i compagni di squadra Mercedes Lewis Hamilton e Nico Rosberg per tutta la durata della gara.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Bahrain_International_Circuit',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026tracksakhirdetailed.webp'
    },
    {
      id: 'jeddah',
      name: 'Jeddah Corniche Circuit',
      location: 'Jeddah',
      country: 'Arabia Saudita',
      country_code: 'SA',
      continent: 'Medio Oriente',
      gp_circuit_filter: 'Jeddah',
      length_km: 6.174,
      turns: 27,
      first_grand_prix: 2021,
      lap_record: {
        time: '1:30.734',
        driver: 'Lewis Hamilton',
        year: 2021
      },
      description: 'Il circuito cittadino più veloce del mondo, adagiato lungo la costa del Mar Rosso con 27 curve ad altissima velocità tra i muretti.',
      history: 'Progettato da Carsten Tilke e inaugurato nel 2021, si corre in notturna con velocità medie superiori ai 250 km/h, seconde solo a Monza.',
      memorable_moment: 'L\'incredibile giro di qualifica sfiorato da Max Verstappen nel 2021 e la tesissima gara inaugurale contro Lewis Hamilton.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Jeddah_Corniche_Circuit',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackjeddahdetailed.webp'
    },
    {
      id: 'zandvoort',
      name: 'Circuit Zandvoort',
      location: 'Zandvoort',
      country: 'Paesi Bassi',
      country_code: 'NL',
      continent: 'Europa',
      gp_circuit_filter: 'Zandvoort',
      length_km: 4.259,
      turns: 14,
      first_grand_prix: 1952,
      lap_record: {
        time: '1:11.097',
        driver: 'Lewis Hamilton',
        year: 2021
      },
      description: 'Pista old-school immersa tra le dune costiere del Mare del Nord, celebre per le sue curve sopraelevate (banking) fino a 18 gradi.',
      history: 'Storica sede del GP d\'Olanda dal 1952 al 1985, è tornata in calendario nel 2021 spinta dall\'entusiasmo della "Orange Army" per Max Verstappen.',
      memorable_moment: 'Il ritorno del GP d\'Olanda nel 2021 dopo 36 anni di assenza, coronato dalla pole position e vittoria di Max Verstappen davanti al suo pubblico.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Zandvoort',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackzandvoortdetailed.webp'
    },
    {
      id: 'austin',
      name: 'Circuit of the Americas',
      location: 'Austin',
      country: 'Stati Uniti',
      country_code: 'US',
      continent: 'Americhe',
      gp_circuit_filter: 'Austin',
      length_km: 5.513,
      turns: 20,
      first_grand_prix: 2012,
      lap_record: {
        time: '1:36.169',
        driver: 'Charles Leclerc',
        year: 2019
      },
      description: 'Tracciato moderno e spettacolare caratterizzato dalla ripida salita verso la prima curva cieca e da una sequenza veloce ispirata a Silverstone e Suzuka.',
      history: 'Inaugurato nel 2012 in Texas, il COTA ha ridato una casa stabile e amatissima alla Formula 1 negli Stati Uniti.',
      memorable_moment: 'L\'ultima vittoria in carriera di Kimi Räikkönen con la Ferrari nel 2018, a distanza di oltre cinque anni dal suo successo precedente.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_delle_Americhe',
      image_url: 'https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026trackaustindetailed.webp'
    }
  ];

  getCircuits(): Circuit[] {
    return this.circuits;
  }

  getCircuitById(id: string): Circuit | undefined {
    return this.circuits.find(c => c.id === id);
  }

  getCircuitsByCountry(countryCode: string): Circuit[] {
    return this.circuits.filter(c => c.country_code === countryCode);
  }
}
