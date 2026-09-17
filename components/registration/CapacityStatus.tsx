import type { DivisionCapacityStatus } from "@/types/database";

interface CapacityStatusProps {
  middle: DivisionCapacityStatus;
  high: DivisionCapacityStatus;
}

export function CapacityStatus({ middle, high }: CapacityStatusProps) {
  return (
    <section className="mx-auto max-w-2xl px-4 pt-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-slate-800">현재 참가신청 현황</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DivisionBar label="중등부" status={middle} />
          <DivisionBar label="고등부" status={high} />
        </div>
      </div>
    </section>
  );
}

function DivisionBar({ label, status }: { label: string; status: DivisionCapacityStatus }) {
  const { count, max } = status;
  const isFull = count >= max;
  const remaining = Math.max(max - count, 0);
  const ratio = max > 0 ? Math.min(count / max, 1) : 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className={`font-semibold ${isFull ? "text-rose-600" : "text-brand-700"}`}>
          {count} / {max}팀 신청
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${isFull ? "bg-rose-500" : "bg-brand-600"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <p className={`mt-1.5 text-xs font-medium ${isFull ? "text-rose-600" : "text-slate-500"}`}>
        {isFull ? "모집마감" : `잔여 ${remaining}팀`}
      </p>
    </div>
  );
}
