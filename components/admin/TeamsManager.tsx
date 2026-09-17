"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "./StatusBadge";
import { buildTeamsCsv, downloadCsv } from "@/lib/csv";
import { TOURNAMENT_INFO, TEAM_STATUS, type TeamStatus } from "@/config/tournament";
import type { Division } from "@/config/tournament";
import type { PlayerRow, TeamRow } from "@/types/database";

type DivisionFilter = "전체" | Division;
type StatusFilter = "전체" | TeamStatus;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function TeamsManager() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [playersByTeamId, setPlayersByTeamId] = useState<Map<string, PlayerRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("전체");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("전체");

  async function loadTeams() {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data: teamRows, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (teamError) {
      setError("참가팀 목록을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    const rows = (teamRows ?? []) as TeamRow[];
    setTeams(rows);

    if (rows.length > 0) {
      const { data: playerRows } = await supabase
        .from("players")
        .select("*")
        .in("team_id", rows.map((t) => t.id));

      const map = new Map<string, PlayerRow[]>();
      for (const p of (playerRows ?? []) as PlayerRow[]) {
        const list = map.get(p.team_id) ?? [];
        list.push(p);
        map.set(p.team_id, list);
      }
      setPlayersByTeamId(map);
    } else {
      setPlayersByTeamId(new Map());
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTeams = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return teams.filter((team) => {
      if (divisionFilter !== "전체" && team.division !== divisionFilter) return false;
      if (statusFilter !== "전체" && team.status !== statusFilter) return false;

      if (!keyword) return true;

      const teamPlayers = playersByTeamId.get(team.id) ?? [];
      const haystack = [
        team.registration_number,
        team.team_name,
        team.representative_name,
        team.representative_phone,
        ...teamPlayers.map((p) => p.school_name),
        ...teamPlayers.map((p) => p.player_name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [teams, playersByTeamId, search, divisionFilter, statusFilter]);

  function handleResetFilters() {
    setSearch("");
    setDivisionFilter("전체");
    setStatusFilter("전체");
  }

  function handleDownloadCsv() {
    const csv = buildTeamsCsv(filteredTeams, playersByTeamId);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`3x3basketball_teams_${today}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900">참가팀 관리</h1>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={filteredTeams.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          참가현황 CSV 다운로드
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="접수번호 / 팀명 / 선수 이름 / 선수 학교명 / 대표자연락처 검색"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:col-span-2"
          />

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value as DivisionFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="전체">전체 부문</option>
            {TOURNAMENT_INFO.divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="전체">전체 상태</option>
            {TEAM_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            총 {filteredTeams.length}팀 (전체 {teams.length}팀 중)
          </span>
          <button type="button" onClick={handleResetFilters} className="font-medium text-brand-600">
            검색 초기화
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">조건에 맞는 참가팀이 없습니다.</p>
      ) : (
        <>
          {/* PC: 표 형태 */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">접수번호</th>
                  <th className="px-4 py-2 font-medium">접수일시</th>
                  <th className="px-4 py-2 font-medium">참가부문</th>
                  <th className="px-4 py-2 font-medium">팀명</th>
                  <th className="px-4 py-2 font-medium">선수인원</th>
                  <th className="px-4 py-2 font-medium">대표자</th>
                  <th className="px-4 py-2 font-medium">신청상태</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {team.registration_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(team.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{team.division}</td>
                    <td className="px-4 py-3 text-slate-600">{team.team_name}</td>
                    <td className="px-4 py-3 text-slate-600">{team.player_count}명</td>
                    <td className="px-4 py-3 text-slate-600">{team.representative_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={team.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/teams/${team.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 형태 */}
          <div className="space-y-3 lg:hidden">
            {filteredTeams.map((team) => (
              <Link
                key={team.id}
                href={`/admin/teams/${team.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-700">{team.registration_number}</span>
                  <StatusBadge status={team.status} />
                </div>
                <p className="mt-2 text-base font-semibold text-slate-900">{team.team_name}</p>
                <p className="text-sm text-slate-500">{team.division}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>대표자 {team.representative_name}</span>
                  <span>{team.player_count}명</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(team.created_at)} 접수</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
