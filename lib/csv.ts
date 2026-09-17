import type { PlayerRow, TeamRow } from "@/types/database";
import { TOURNAMENT_INFO } from "@/config/tournament";

function csvEscape(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/**
 * 참가팀 목록 CSV.
 * 컬럼 순서: 접수번호, 참가부문, 팀명, 선수인원, [선수N 이름, 선수N 학교명, 선수N 학년, 선수N 연락처] x N, 신청상태, 접수일시
 * (팀 단위 학교명은 더 이상 사용하지 않으므로 컬럼에서 제외하고, 학교명은 선수별로 각각 기재합니다.)
 */
export function buildTeamsCsv(teams: TeamRow[], playersByTeamId: Map<string, PlayerRow[]>): string {
  const header = ["접수번호", "참가부문", "팀명", "선수인원"];

  for (let i = 1; i <= TOURNAMENT_INFO.teamSizeMax; i++) {
    header.push(`선수${i} 이름`, `선수${i} 학교명`, `선수${i} 학년`, `선수${i} 연락처`);
  }

  header.push("신청상태", "접수일시");

  const rows = teams.map((team) => {
    const players = (playersByTeamId.get(team.id) ?? [])
      .slice()
      .sort((a, b) => a.player_order - b.player_order);

    const row: (string | number)[] = [team.registration_number, team.division, team.team_name, team.player_count];

    for (let i = 0; i < TOURNAMENT_INFO.teamSizeMax; i++) {
      const p = players[i];
      row.push(
        p?.player_name ?? "",
        p?.school_name ?? "",
        p ? `${p.grade}학년` : "",
        p?.phone ?? ""
      );
    }

    row.push(team.status, formatDateTime(team.created_at));

    return row;
  });

  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(","));

  // 한글 Excel 호환을 위한 UTF-8 BOM
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
