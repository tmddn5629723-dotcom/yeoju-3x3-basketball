import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeDashboardStats } from "@/lib/adminStats";
import type { EventSettingsRow, PlayerRow, TeamRow } from "@/types/database";
import { TEAM_STATUS_LABELS, DEFAULT_DIVISION_CAPACITY, type Division } from "@/config/tournament";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: teamsData, error } = await supabase
    .from("teams")
    .select("*")
    .is("deleted_at", null);

  const teams = (teamsData ?? []) as TeamRow[];

  const { data: playersData } =
    teams.length > 0
      ? await supabase
          .from("players")
          .select("*")
          .in("team_id", teams.map((t) => t.id))
      : { data: [] as PlayerRow[] };

  const players = (playersData ?? []) as PlayerRow[];

  const { data: settingsData } = await supabase
    .from("event_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const settings = settingsData as EventSettingsRow | null;

  const capacityMap: Record<Division, number> = {
    중등부: settings?.middle_max_teams ?? DEFAULT_DIVISION_CAPACITY.중등부,
    고등부: settings?.high_max_teams ?? DEFAULT_DIVISION_CAPACITY.고등부,
  };

  const stats = computeDashboardStats(teams, players, capacityMap);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">참가신청 현황</h1>
        <p className="text-sm text-slate-500">Supabase 데이터를 기준으로 자동 집계됩니다. (참가신청 페이지와 동일한 집계 기준)</p>
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            데이터를 불러오지 못했습니다: {error.message}
          </p>
        )}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.byDivision.map((d) => (
          <div
            key={d.division}
            className={`rounded-xl border p-4 shadow-sm ${
              d.isFull ? "border-rose-200 bg-rose-50" : "border-brand-200 bg-brand-50"
            }`}
          >
            <p className={`text-xs font-medium ${d.isFull ? "text-rose-600" : "text-brand-600"}`}>{d.division}</p>
            <p className={`mt-1 text-lg font-extrabold ${d.isFull ? "text-rose-700" : "text-brand-700"}`}>
              {d.teamCount}/{d.max}팀, 선수 {d.playerCount}명
            </p>
            <p className={`mt-0.5 text-sm font-semibold ${d.isFull ? "text-rose-600" : "text-slate-500"}`}>
              {d.isFull ? "모집마감" : `잔여 ${d.remaining}팀`}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="전체 신청팀" value={`${stats.totalTeams}팀`} highlight />
        <StatCard label="전체 참가선수" value={`${stats.totalPlayers}명`} highlight />
        <StatCard label={TEAM_STATUS_LABELS.참가확정} value={`${stats.byStatus.참가확정}팀`} />
        <StatCard label={TEAM_STATUS_LABELS.대기} value={`${stats.byStatus.대기}팀`} />
        <StatCard label={TEAM_STATUS_LABELS.참가취소} value={`${stats.byStatus.참가취소}팀`} />
        <StatCard label={TEAM_STATUS_LABELS.접수} value={`${stats.byStatus.접수}팀`} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-800">학교별 집계 (선수 기준)</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {stats.bySchool.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">등록된 신청이 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">학교명</th>
                  <th className="px-4 py-2 font-medium">참가팀 수</th>
                  <th className="px-4 py-2 font-medium">참가선수 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.bySchool.map((s) => (
                  <tr key={s.schoolName}>
                    <td className="px-4 py-2 text-slate-800">{s.schoolName}</td>
                    <td className="px-4 py-2 text-slate-600">{s.teamCount}팀</td>
                    <td className="px-4 py-2 text-slate-600">{s.playerCount}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        highlight ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium ${highlight ? "text-brand-600" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-extrabold ${highlight ? "text-brand-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
