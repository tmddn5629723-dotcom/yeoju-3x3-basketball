import type { PlayerRow, TeamRow } from "@/types/database";
import { TEAM_STATUS, type TeamStatus } from "@/config/tournament";
import type { Division } from "@/config/tournament";

/**
 * 부문별 모집정원 집계 통계.
 * teamCount/playerCount는 "참가신청 페이지의 실시간 현황"과 동일한 기준(소프트삭제 및 참가취소 제외)으로 집계합니다.
 * (관리자 대시보드와 참가신청 페이지가 서로 다른 숫자를 보여주지 않도록 하기 위함입니다.)
 */
export interface DivisionStat {
  division: Division;
  teamCount: number;
  playerCount: number;
  max: number;
  remaining: number;
  isFull: boolean;
}

export interface SchoolStat {
  schoolName: string;
  teamCount: number;
  playerCount: number;
}

export interface DashboardStats {
  totalTeams: number;
  totalPlayers: number;
  byDivision: DivisionStat[];
  byStatus: Record<TeamStatus, number>;
  bySchool: SchoolStat[];
}

/**
 * 관리자 대시보드 통계를 팀 목록 + 선수 목록으로 집계합니다.
 * 소프트삭제(deleted_at)된 팀은 이 함수에 넘기기 전에 이미 제외되어 있어야 합니다.
 *
 * @param teams 소프트삭제되지 않은 전체 팀 목록
 * @param players 위 teams에 속한 전체 선수 목록 (학교별 집계에 사용)
 * @param capacityMap 부문별 모집정원 (event_settings 테이블 값)
 */
export function computeDashboardStats(
  teams: TeamRow[],
  players: PlayerRow[],
  capacityMap: Record<Division, number>
): DashboardStats {
  const byStatus: Record<TeamStatus, number> = {
    접수: 0,
    참가확정: 0,
    대기: 0,
    참가취소: 0,
  };

  const divisionMap = new Map<Division, DivisionStat>();
  for (const [division, max] of Object.entries(capacityMap) as [Division, number][]) {
    divisionMap.set(division, { division, teamCount: 0, playerCount: 0, max, remaining: max, isFull: max <= 0 });
  }

  let totalPlayers = 0;
  // 정원 집계와 동일한 기준(참가취소 제외)에 해당하는 team_id만 모아, 학교별 집계에도 재사용합니다.
  const activeTeamIds = new Set<string>();

  for (const team of teams) {
    totalPlayers += team.player_count;
    byStatus[team.status] = (byStatus[team.status] ?? 0) + 1;

    // 참가신청 페이지의 실시간 현황과 동일하게, "참가취소" 상태는 정원 집계에서 제외합니다.
    if (team.status === "참가취소") continue;

    activeTeamIds.add(team.id);

    const stat = divisionMap.get(team.division) ?? {
      division: team.division,
      teamCount: 0,
      playerCount: 0,
      max: 0,
      remaining: 0,
      isFull: false,
    };
    stat.teamCount += 1;
    stat.playerCount += team.player_count;
    divisionMap.set(team.division, stat);
  }

  for (const stat of divisionMap.values()) {
    stat.remaining = Math.max(stat.max - stat.teamCount, 0);
    stat.isFull = stat.teamCount >= stat.max;
  }

  // 학교별 집계: 이제 학교명은 팀 단위가 아닌 선수 단위 정보이므로, 선수 목록 기준으로 다시 집계합니다.
  // (참가취소된 팀의 선수는 제외하여 정원 집계와 기준을 맞춥니다.)
  const schoolMap = new Map<string, { schoolName: string; playerCount: number; teamIds: Set<string> }>();
  for (const player of players) {
    if (!activeTeamIds.has(player.team_id)) continue;
    const schoolName = player.school_name?.trim();
    if (!schoolName) continue;

    const entry = schoolMap.get(schoolName) ?? { schoolName, playerCount: 0, teamIds: new Set<string>() };
    entry.playerCount += 1;
    entry.teamIds.add(player.team_id);
    schoolMap.set(schoolName, entry);
  }

  const bySchool: SchoolStat[] = Array.from(schoolMap.values())
    .map((s) => ({ schoolName: s.schoolName, teamCount: s.teamIds.size, playerCount: s.playerCount }))
    .sort((a, b) => b.playerCount - a.playerCount);

  return {
    totalTeams: teams.length,
    totalPlayers,
    byDivision: Array.from(divisionMap.values()),
    byStatus,
    bySchool,
  };
}

export const ALL_STATUSES = TEAM_STATUS;
