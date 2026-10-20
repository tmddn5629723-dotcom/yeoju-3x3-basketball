import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { CapacityStatus } from "@/components/registration/CapacityStatus";
import { PromoMaterials } from "@/components/registration/PromoMaterials";
import {
  TOURNAMENT_INFO,
  DEFAULT_EVENT_SETTINGS,
  formatRecruitmentPeriodLabel,
  formatEventDateTimeLabel,
  type Division,
} from "@/config/tournament";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getPublicAssetUrl } from "@/lib/storage";
import type { PublicEventStatus } from "@/types/database";

// 대회정보/실시간 참가신청 현황/접수상태를 항상 최신 데이터로 보여줘야 하므로 캐시를 사용하지 않습니다.
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
    // 조회 실패 시에도 페이지 전체가 죽지 않도록, 설정 파일의 기본값으로 대체합니다.
    // (신청 자체는 서버의 register_team()에서 접수상태/정원을 다시 한번 확인하므로 안전합니다.)
    return {
      poster_path: null,
      guidelines_path: null,
      middle: { count: 0, max: 5 },
      high: { count: 0, max: 5 },
      ...DEFAULT_EVENT_SETTINGS,
    };
  }
}

export default async function HomePage() {
  const status = await fetchPublicEventStatus();

  const middleFull = status.middle.count >= status.middle.max;
  const highFull = status.high.count >= status.high.max;
  const allFull = middleFull && highFull;

  const registrationClosedByAdmin = status.registration_status !== "접수중";
  const registrationClosed = registrationClosedByAdmin || allFull;

  const divisionFullMap: Partial<Record<Division, boolean>> = {
    중등부: middleFull,
    고등부: highFull,
  };

  const posterUrl = getPublicAssetUrl(status.poster_path);
  const guidelinesUrl = getPublicAssetUrl(status.guidelines_path);

  const title = status.tournament_title || TOURNAMENT_INFO.fullTitle;
  const dateTimeLabel = formatEventDateTimeLabel(status.event_date, status.event_time);
  const recruitmentLabel = formatRecruitmentPeriodLabel(status.recruitment_start, status.recruitment_end);

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
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>

          {status.intro_text && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-50">{status.intro_text}</p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm text-brand-50 sm:grid-cols-3">
            <InfoRow label="모집기간" value={recruitmentLabel} />
            <InfoRow label="대회일시" value={dateTimeLabel} />
            <InfoRow label="대회장소" value={status.event_location} />
            <InfoRow label="참가비" value={status.fee_label} />
            <InfoRow label="팀 구성" value={TOURNAMENT_INFO.teamSizeLabel} />
            <InfoRow label="참가부문" value={TOURNAMENT_INFO.divisions.join(" / ")} />
          </dl>
        </div>
      </header>

      {registrationClosedByAdmin && (
        <div className="bg-rose-600 px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
          현재 참가신청 접수가 마감되었습니다.
        </div>
      )}
      {!registrationClosedByAdmin && allFull && (
        <div className="bg-rose-600 px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
          3x3 농구대회 참가신청이 마감되었습니다.
        </div>
      )}

      {status.show_notice && status.notice_text && (
        <section className="mx-auto max-w-2xl px-4 pt-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 whitespace-pre-line">
            <p className="mb-1 text-xs font-bold text-amber-600">공지사항</p>
            {status.notice_text}
          </div>
        </section>
      )}

      <CapacityStatus middle={status.middle} high={status.high} />
      <PromoMaterials posterUrl={posterUrl} guidelinesUrl={guidelinesUrl} />

      {status.guidance_text && (
        <section className="mx-auto max-w-2xl px-4 pt-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-sm whitespace-pre-line">
            <p className="mb-1 text-xs font-bold text-slate-400">참가 안내사항 및 유의사항</p>
            {status.guidance_text}
          </div>
        </section>
      )}

      {registrationClosed ? (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">
            {registrationClosedByAdmin
              ? "현재 참가신청 접수가 마감되었습니다."
              : "모든 부문의 참가신청이 마감되었습니다."}
          </p>
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
