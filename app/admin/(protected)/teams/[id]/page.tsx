import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamDetailClient } from "@/components/admin/TeamDetailClient";
import type { PlayerRow, TeamRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!team) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">참가팀을 찾을 수 없습니다.</p>
        <Link href="/admin/teams" className="mt-4 inline-block text-sm font-medium text-brand-600">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", id)
    .order("player_order", { ascending: true });

  return (
    <div>
      <Link href="/admin/teams" className="mb-4 inline-block text-sm font-medium text-brand-600">
        ← 참가팀 목록
      </Link>
      <TeamDetailClient team={team as TeamRow} players={(players ?? []) as PlayerRow[]} />
    </div>
  );
}
