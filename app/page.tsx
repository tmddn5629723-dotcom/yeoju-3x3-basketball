import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { CapacityStatus } from "@/components/registration/CapacityStatus";
import { PromoMaterials } from "@/components/registration/PromoMaterials";
import { TOURNAMENT_INFO, isApplicationOpen, DEFAULT_DIVISION_CAPACITY, type Division } from "@/config/tournament";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getPublicAssetUrl } from "@/lib/storage";
import type { PublicEventStatus } from "@/types/database";

// 실시간 참가신청 현황(정원)을 항상 최신 데이터로 보여줘야 하므로 캐시를 사용하지 않습니다.
export const dynamic = "force-dynamic";

async function fetchPublicEventStatus(): Promise<PublicEventStatus> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("get_public_event_status");

    if (error || !data) {
      console.error("get_public_event_status error:", error?.message);
      throw error ?? new Error("NO_DATA");
    }

    return data as PublicEventStatus;
  } catch {
    // 조회 실패 시에도 페이지 전체가 죽지 않도록, 설정 파일의 기본 정원값으로 대체합니다.
    // (신청 자체는 서버의 register_team()에서 다시 한번 정원을 확인하므로 안전합니다.)
    return {
      poster_path: null,
      guidelines_path: null,
      middle: { count: 0, max: DEFAULT_DIVISION_CAPACITY.중등부 },
      high: { count: 0, max: DEFAULT_DIVISION_CAPACITY.고등부 },
    };
  }
}

export default async function HomePage() {
  const applicationOpen = isApplicationOpen();
  const status = await fetchPublicEventStatus();

  const middleFull = status.middle.count >= status.middle.max;
  const highFull = status.high.count >= status.high.max;
  const allFull = middleFull && highFull;

  const divisionFullMap: Partial<Record<Division, boolean>> = {
    중등부: middleFull,
    고등부: highFull,
  };

  const posterUrl = getPublicAssetUrl(status.poster_path);
  const guidelinesUrl = getPublicAssetUrl(status.guidelines_path);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-brand-700 px-4 py-6 text-white sm:py-8">
        <div className="mx-auto max-w-2xl">
          {TOURNAMENT_INFO.logoImagePath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={TOURNAMENT_INFO.logoImagePath}
              alt={TOURNAMENT_INFO.organizerName}
              className="mb-3 h-10 w-auto"
            />
          )}
          <p className="text-sm font-medium text-brand-100">{TOURNAMENT_INFO.title}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{TOURNAMENT_INFO.subtitle}</h1>

          <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm text-brand-50 sm:grid-cols-3">
            <InfoRow label="대회일시" value={TOURNAMENT_INFO.dateLabel} />
            <InfoRow label="대회장소" value={TOURNAMENT_INFO.locationLabel} />
            <InfoRow label="참가비" value={TOURNAMENT_INFO.feeLabel} />
            <InfoRow label="팀 구성" value={TOURNAMENT_INFO.teamSizeLabel} />
            <InfoRow label="참가부문" value={TOURNAMENT_INFO.divisions.join(" / ")} />
          </dl>
        </div>
      </header>

      {allFull && (
        <div className="bg-rose-600 px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
          3x3 농구대회 참가신청이 마감되었습니다.
        </div>
      )}

      <CapacityStatus middle={status.middle} high={status.high} />
      <PromoMaterials posterUrl={posterUrl} guidelinesUrl={guidelinesUrl} />

      {!applicationOpen ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">현재는 참가신청 기간이 아닙니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            참가신청 기간이 시작되면 이 페이지에서 신청서를 작성할 수 있습니다.
          </p>
        </div>
      ) : allFull ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">모든 부문의 참가신청이 마감되었습니다.</p>
          <p className="mt-2 text-sm text-slate-500">참가해 주셔서 감사합니다. 문의사항은 주최측으로 연락해주세요.</p>
        </div>
      ) : (
        <RegistrationForm divisionFullMap={divisionFullMap} />
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-brand-200">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
