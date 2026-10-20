import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageSettingsManager } from "@/components/admin/PageSettingsManager";
import type { TeamRow } from "@/types/database";
import type { Division } from "@/config/tournament";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
  const supabase = await createSupabaseServerClient();

  // 참가신청 페이지/관리자 대시보드와 동일한 기준(소프트삭제·참가취소 제외)으로
  // "부문별 현재 신청 팀 수"를 집계해서 신청페이지 관리 화면에 함께 보여줍니다.
  const { data: teamsData } = await supabase
    .from("teams")
    .select("division, status")
    .is("deleted_at", null);

  const teams = (teamsData ?? []) as Pick<TeamRow, "division" | "status">[];

  const currentCounts: Record<Division, number> = { 중등부: 0, 고등부: 0 };
  for (const team of teams) {
    if (team.status === "참가취소") continue;
    currentCounts[team.division] = (currentCounts[team.division] ?? 0) + 1;
  }

  return <PageSettingsManager currentCounts={currentCounts} />;
}
