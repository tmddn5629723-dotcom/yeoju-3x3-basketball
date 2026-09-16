import type { TeamRow } from "@/types/database";
import { TEAM_STATUS, type TeamStatus } from "@/config/tournament";
import type { Division } from "@/config/tournament";

export interface DivisionStat {
  division: Division;
  teamCount: number;
  playerCount: number;
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
 * 관리자 대시보드 통계를 팀 목록(teams.player_count 포함)만으로 집계합니다.
 * 삭제(soft delete)된 팀은 이 함수에 넘기기 전에 제외되어 있어야 합니다.
 */
export function computeDashboardStats(teams: TeamRow[]): DashboardStats {
  const byStatus: Record<TeamStatus, number> = {
    접수: 0,
    참가확정: 0,
    대기: 0,
    참가취소: 0,
  };

  const divisionMap = new Map<string, DivisionStat>();
  const schoolMap = new Map<string, SchoolStat>();

  let totalPlayers = 0;

  for (const team of teams) {
    totalPlayers += team.player_count;
    byStatus[team.status] = (byStatus[team.status] ?? 0) + 1;

    const division = divisionMap.get(team.division) ?? {
      division: team.division,
      teamCount: 0,
      playerCount: 0,
    };
    division.teamCount += 1;
    division.playerCount += team.player_count;
    divisionMap.set(team.division, division);

    const school = schoolMap.get(team.school_name) ?? {
      schoolName: team.school_name,
      teamCount: 0,
      playerCount: 0,
    };
    school.teamCount += 1;
    school.playerCount += team.player_count;
    schoolMap.set(team.school_name, school);
  }

  return {
    totalTeams: teams.length,
    totalPlayers,
    byDivision: Array.from(divisionMap.values()),
    byStatus,
    bySchool: Array.from(schoolMap.values()).sort((a, b) => b.teamCount - a.teamCount),
  };
}

export const ALL_STATUSES = TEAM_STATUS;
