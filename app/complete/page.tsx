import Link from "next/link";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyReceiptToken, RECEIPT_COOKIE_NAME } from "@/lib/receiptCookie";
import { TOURNAMENT_INFO } from "@/config/tournament";
import { DetailToggle } from "@/components/registration/DetailToggle";
import type { PlayerRow, TeamRow } from "@/types/database";

export default async function CompletePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RECEIPT_COOKIE_NAME)?.value;
  const teamId = verifyReceiptToken(token);

  if (!teamId) {
    return <NotFoundView />;
  }

  const supabase = createSupabaseAdminClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .is("deleted_at", null)
    .single();

  if (teamError || !team) {
    return <NotFoundView />;
  }

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("player_order", { ascending: true });

  const teamRow = team as TeamRow;
  const playerRows = (players ?? []) as PlayerRow[];
  const representative = playerRows.find((p) => p.is_representative) ?? playerRows[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-3xl">
            🏀
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">참가신청이 완료되었습니다.</h1>
          <p className="mt-1 text-sm text-slate-500">
            {TOURNAMENT_INFO.title}
            <br />
            {TOURNAMENT_INFO.subtitle}
          </p>

          <div className="mt-6 rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-xs font-medium text-brand-600">접수번호</p>
            <p className="text-2xl font-extrabold tracking-wide text-brand-700">
              {teamRow.registration_number}
            </p>
          </div>

          <dl className="mt-6 space-y-3 text-left text-sm">
            <SummaryRow label="학교명" value={teamRow.school_name} />
            <SummaryRow label="팀명" value={teamRow.team_name} />
            <SummaryRow label="참가부문" value={teamRow.division} />
            <SummaryRow label="참가선수" value={`${teamRow.player_count}명`} />
            <SummaryRow label="대표자" value={representative?.player_name ?? "-"} />
          </dl>

          <DetailToggle players={playerRows} />

          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            참가팀 확정 및 세부 대회일정은 추후 팀 대표자 연락처를 통해 안내할 예정입니다.
          </p>

          <Link
            href="/"
            className="mt-6 block w-full rounded-xl border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700"
          >
            처음으로
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function NotFoundView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-700">조회 가능한 신청내역이 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">
          신청 직후에만 이 페이지에서 접수내용을 확인할 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white"
        >
          처음으로
        </Link>
      </div>
    </main>
  );
}
