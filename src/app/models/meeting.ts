export interface Meeting {
  id: number;
  meeting_key: number;
  year: number;
  meeting_code: string;
  meeting_name: string;
  meeting_official_name: string;
  country_code: string;
  country_name: string;
  location: string;
  circuit_short_name: string;
  date_start: string;
  gmt_offset: string;
  circuit_key?: number;
  circuit_image?: string; // mappa del tracciato da formula1.com
  country_flag?: string;
}
