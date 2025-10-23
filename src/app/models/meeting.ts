export interface Meeting {
    id: number;
    meeting_key: number;
    circuit_key: number;
    circuit_short_name: string;
    meeting_code: string;
    location: string;
    country_key: number;
    country_code: string;
    country_name: string;
    meeting_name: string;
    meeting_official_name: string;
    gmt_offset: string;
    date_start: string;
    year: number;
}
