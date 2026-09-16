const STEPS = ["팀 정보", "선수 등록", "동의 및 확인", "신청 완료"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-xl bg-white px-3 py-3 shadow-sm sm:gap-2 sm:px-4">
      {STEPS.map((label, i) => {
        const stepNumber = i + 1;
        const active = stepNumber === current;
        const done = stepNumber < current;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 text-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {String(stepNumber).padStart(2, "0")}
              </div>
              <span
                className={`text-[11px] leading-none sm:text-xs ${
                  active ? "font-semibold text-brand-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {stepNumber !== STEPS.length && (
              <div className={`mx-1 h-px flex-1 sm:mx-2 ${done ? "bg-brand-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
