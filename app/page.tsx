import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { TOURNAMENT_INFO, isApplicationOpen } from "@/config/tournament";

export default function HomePage() {
  const applicationOpen = isApplicationOpen();

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

          {TOURNAMENT_INFO.posterImagePath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={TOURNAMENT_INFO.posterImagePath}
              alt="대회 포스터"
              className="mt-4 w-full rounded-xl object-cover"
            />
          )}

          <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm text-brand-50 sm:grid-cols-3">
            <InfoRow label="대회일시" value={TOURNAMENT_INFO.dateLabel} />
            <InfoRow label="대회장소" value={TOURNAMENT_INFO.locationLabel} />
            <InfoRow label="참가비" value={TOURNAMENT_INFO.feeLabel} />
            <InfoRow label="팀 구성" value={TOURNAMENT_INFO.teamSizeLabel} />
            <InfoRow label="참가부문" value={TOURNAMENT_INFO.divisions.join(" / ")} />
          </dl>
        </div>
      </header>

      {applicationOpen ? (
        <RegistrationForm />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">현재는 참가신청 기간이 아닙니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            참가신청 기간이 시작되면 이 페이지에서 신청서를 작성할 수 있습니다.
          </p>
        </div>
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
