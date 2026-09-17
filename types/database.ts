import type { Division, TeamStatus } from "@/config/tournament";

export interface PlayerRow {
  id: string;
  team_id: string;
  player_order: number;
  player_name: string;
  grade: number;
  phone: string;
  school_name: string;
  is_representative: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  registration_number: string;
  client_request_id: string;
  division: Division;
  /** 팀 단위 학교명은 더 이상 사용하지 않습니다 (선수별 school_name으로 대체). 과거 데이터 호환을 위해 컬럼만 유지. */
  school_name: string | null;
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
  school_name: string;
  is_representative: boolean;
}

/** 참가신청 폼 전체 데이터 */
export interface RegistrationFormValue {
  division: Division | "";
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
    school_name: string;
    is_representative: boolean;
  }[];
}

export interface RegisterTeamResult {
  team_id: string;
  registration_number: string;
  duplicate: boolean;
}

/** event_settings 테이블 (모집정원 + 홍보자료 Storage 경로, 단일 행) */
export interface EventSettingsRow {
  id: number;
  poster_path: string | null;
  guidelines_path: string | null;
  middle_max_teams: number;
  high_max_teams: number;
  updated_at: string;
}

export interface DivisionCapacityStatus {
  count: number;
  max: number;
}

/** get_public_event_status() RPC 결과 (참가자 페이지에서 사용, 개인정보 미포함) */
export interface PublicEventStatus {
  poster_path: string | null;
  guidelines_path: string | null;
  middle: DivisionCapacityStatus;
  high: DivisionCapacityStatus;
}
