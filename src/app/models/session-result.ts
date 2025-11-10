export interface SessionResult {
  session_key: number;
  position: number;
  driver_number: number;
  broadcast_name: string;
  team_name: string;
  team_color: string;
  laps: number;
  lap_time: string | null;
  gap_to_leader: string | null;
  status: string | null;
  points: number | null;
}