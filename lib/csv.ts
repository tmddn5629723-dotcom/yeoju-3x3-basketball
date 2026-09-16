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

export function buildTeamsCsv(teams: TeamRow[], playersByTeamId: Map<string, PlayerRow[]>): string {
  const header = [
    "접수번호",
    "접수일시",
    "참가부문",
    "학교명",
    "팀명",
    "선수인원",
  ];

  for (let i = 1; i <= TOURNAMENT_INFO.teamSizeMax; i++) header.push(`선수${i}이름`);
  for (let i = 1; i <= TOURNAMENT_INFO.teamSizeMax; i++) header.push(`선수${i}학년`);
  for (let i = 1; i <= TOURNAMENT_INFO.teamSizeMax; i++) header.push(`선수${i}연락처`);

  header.push("대표자", "대표자연락처", "신청상태");

  const rows = teams.map((team) => {
    const players = (playersByTeamId.get(team.id) ?? [])
      .slice()
      .sort((a, b) => a.player_order - b.player_order);

    const row: (string | number)[] = [
      team.registration_number,
      formatDateTime(team.created_at),
      team.division,
      team.school_name,
      team.team_name,
      team.player_count,
    ];

    for (let i = 0; i < TOURNAMENT_INFO.teamSizeMax; i++) row.push(players[i]?.player_name ?? "");
    for (let i = 0; i < TOURNAMENT_INFO.teamSizeMax; i++) {
      row.push(players[i] ? `${players[i].grade}학년` : "");
    }
    for (let i = 0; i < TOURNAMENT_INFO.teamSizeMax; i++) row.push(players[i]?.phone ?? "");

    row.push(team.representative_name, team.representative_phone, team.status);

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
