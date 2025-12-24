export interface Circuit {
  id: string;
  name: string;
  location: string;
  country: string;
  country_code: string;
  length_km: number;
  turns: number;
  first_grand_prix: number;
  lap_record?: {
    time: string;
    driver: string;
    year: number;
  };
  description: string;
  history: string;
  memorable_moment: string;
  wikipedia_url: string;
  image_url: string;
}
