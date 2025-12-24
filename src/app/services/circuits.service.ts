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
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'spa',
      name: 'Circuit de Spa-Francorchamps',
      location: 'Spa',
      country: 'Belgio',
      country_code: 'BE',
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
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Belgium_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'monaco',
      name: 'Circuit de Monaco',
      location: 'Monte Carlo',
      country: 'Monaco',
      country_code: 'MC',
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
      memorable_moment: 'Il sorpasso impossibile di Ayrton Senna su 5 piloti al primo giro nel 1992, sotto la pioggia, dimostrando il suo talento soprannaturale.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Monaco',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'silverstone',
      name: 'Silverstone Circuit',
      location: 'Silverstone',
      country: 'Regno Unito',
      country_code: 'GB',
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
      memorable_moment: 'Il duello Hamilton-Verstappen nel 2021 che ha visto un contatto controverso a Copse, simbolo della battaglia per il titolo di quella stagione.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Silverstone',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Great_Britain_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'suzuka',
      name: 'Suzuka International Racing Course',
      location: 'Suzuka',
      country: 'Giappone',
      country_code: 'JP',
      length_km: 5.807,
      turns: 18,
      first_grand_prix: 1987,
      lap_record: {
        time: '1:30.983',
        driver: 'Lewis Hamilton',
        year: 2019
      },
      description: 'L\'unico circuito a forma di "8" del calendario. Celebre per la curva 130R e il complesso di Spoon Curve.',
      history: 'Progettato dal leggendario pilota olandese John Hugenholtz, Suzuka è considerato uno dei circuiti più tecnici e completi. È stato teatro di numerosi titoli mondiali decisi all\'ultima gara.',
      memorable_moment: 'Lo scontro Senna-Prost del 1990 che decise il campionato al primo tornante, uno dei momenti più controversi della F1.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Suzuka_International_Racing_Course',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'interlagos',
      name: 'Autódromo José Carlos Pace',
      location: 'San Paolo',
      country: 'Brasile',
      country_code: 'BR',
      length_km: 4.309,
      turns: 15,
      first_grand_prix: 1973,
      lap_record: {
        time: '1:10.540',
        driver: 'Valtteri Bottas',
        year: 2018
      },
      description: 'Circuito in senso antiorario con dislivelli pronunciati. Noto per l\'atmosfera elettrica e il tifo appassionato dei tifosi brasiliani.',
      history: 'Intitolato al pilota brasiliano José Carlos Pace, Interlagos ha ospitato momenti indimenticabili. Il layout compatto e i dislivelli lo rendono una delle piste più spettacolari.',
      memorable_moment: 'La vittoria di Ayrton Senna nel 1991, la sua prima in casa, dove vinse praticamente svenuto per lo sforzo, bloccato in sesta marcia.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Brazil_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'yas-marina',
      name: 'Yas Marina Circuit',
      location: 'Abu Dhabi',
      country: 'Emirati Arabi Uniti',
      country_code: 'AE',
      length_km: 5.281,
      turns: 16,
      first_grand_prix: 2009,
      lap_record: {
        time: '1:26.103',
        driver: 'Max Verstappen',
        year: 2021
      },
      description: 'Circuito moderno che attraversa l\'hotel W, con una sezione che si corre al tramonto. Sede di finali di campionato emozionanti.',
      history: 'Inaugurato nel 2009, Yas Marina rappresenta il lusso e la modernità dei circuiti del Medio Oriente. Ha subito modifiche nel 2021 per migliorare i sorpassi.',
      memorable_moment: 'Il controverso finale del 2021, dove Verstappen ha superato Hamilton all\'ultimo giro dell\'ultima gara per conquistare il suo primo titolo mondiale.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Yas_Marina_Circuit',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit.png.transform/7col/image.png'
    },
    {
      id: 'melbourne',
      name: 'Albert Park Circuit',
      location: 'Melbourne',
      country: 'Australia',
      country_code: 'AU',
      length_km: 5.278,
      turns: 14,
      first_grand_prix: 1996,
      lap_record: {
        time: '1:20.260',
        driver: 'Charles Leclerc',
        year: 2022
      },
      description: 'Circuito cittadino temporaneo costruito attorno al lago di Albert Park. Noto per essere spesso teatro della gara d\'apertura della stagione.',
      history: 'Melbourne ha sostituito Adelaide come sede del GP d\'Australia nel 1996. Il circuito offre un mix di sezioni veloci e tecniche, circondato da uno scenario naturale spettacolare.',
      memorable_moment: 'Il dominio di Michael Schumacher che qui vinse 4 volte consecutive dal 2000 al 2004, inaugurando campionati leggendari.',
      wikipedia_url: 'https://it.wikipedia.org/wiki/Circuito_di_Albert_Park',
      image_url: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit.png.transform/7col/image.png'
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
