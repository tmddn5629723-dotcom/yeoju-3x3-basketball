"use client";

import type { RegistrationFormValue } from "@/types/database";

interface ConfirmModalProps {
  value: RegistrationFormValue;
  submitting: boolean;
  errorMessage: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ value, submitting, errorMessage, onEdit, onConfirm }: ConfirmModalProps) {
  const representative = value.players[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h2 className="text-lg font-bold text-slate-900">아래 내용으로 참가신청하시겠습니까?</h2>
        <p className="mt-1 text-sm text-slate-500">제출 후에는 관리자를 통해서만 수정할 수 있습니다.</p>

        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <Row label="참가부문" value={value.division} />
          <Row label="팀명" value={value.team_name} />
          <Row label="참가선수" value={`${value.players.length}명`} />
          <Row label="대표자" value={representative?.player_name ?? "-"} />
          <Row label="대표자 연락처" value={representative?.phone ?? "-"} />
        </dl>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">전체 선수 명단</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {value.players.map((p, i) => (
              <li key={p.key} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700">
                  {i + 1}. {p.player_name} / {p.school_name} / {p.grade}학년 / {p.phone}
                  {p.is_representative ? " / 대표자" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onEdit}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "신청 처리 중..." : "참가신청 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
