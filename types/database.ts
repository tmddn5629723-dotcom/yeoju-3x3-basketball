import type { Division, TeamStatus } from "@/config/tournament";

export interface PlayerRow {
  id: string;
  team_id: string;
  player_order: number;
  player_name: string;
  grade: number;
  phone: string;
  is_representative: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  registration_number: string;
  client_request_id: string;
  division: Division;
  school_name: string;
  team_name: string;
  player_count: number;
  representative_name: string;
  representative_phone: string;
  privacy_agreed: boolean;
  rules_agreed: boolean;
  representative_agreed: boolean;
  media_agreed: boolean;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TeamWithPlayers extends TeamRow {
  players: PlayerRow[];
}

/** 참가신청 폼에서 다루는 선수 1명의 입력 데이터 */
export interface PlayerFormValue {
  key: string; // 프론트에서만 쓰는 고유 key (uuid) - 삭제/추가 시 리스트 관리용
  player_order: number;
  player_name: string;
  grade: string; // 라디오/셀렉트 값 그대로 문자열로 관리 ("1" | "2" | "3")
  phone: string;
  is_representative: boolean;
}

/** 참가신청 폼 전체 데이터 */
export interface RegistrationFormValue {
  division: Division | "";
  school_name: string;
  team_name: string;
  players: PlayerFormValue[];
  privacy_agreed: boolean;
  rules_agreed: boolean;
  representative_agreed: boolean;
  media_agreed: boolean;
}

/** register_team RPC 로 서버에 보내는 payload */
export interface RegisterTeamPayload {
  client_request_id: string;
  division: Division;
  school_name: string;
  team_name: string;
  representative_name: string;
  representative_phone: string;
  privacy_agreed: true;
  rules_agreed: true;
  representative_agreed: true;
  media_agreed: boolean;
  players: {
    player_order: number;
    player_name: string;
    grade: number;
    phone: string;
    is_representative: boolean;
  }[];
}

export interface RegisterTeamResult {
  team_id: string;
  registration_number: string;
  duplicate: boolean;
}
