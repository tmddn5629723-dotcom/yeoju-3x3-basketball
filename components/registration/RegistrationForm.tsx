"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerCard } from "./PlayerCard";
import { ConfirmModal } from "./ConfirmModal";
import { StepIndicator } from "./StepIndicator";
import { FieldError } from "@/components/ui/FieldError";
import { registrationSchema } from "@/lib/validation";
import { TOURNAMENT_INFO, type Division } from "@/config/tournament";
import type { PlayerFormValue, RegistrationFormValue } from "@/types/database";

function createEmptyPlayer(order: number, isRepresentative = false): PlayerFormValue {
  return {
    key: crypto.randomUUID(),
    player_order: order,
    player_name: "",
    grade: "",
    phone: "",
    school_name: "",
    is_representative: isRepresentative,
  };
}

function createInitialForm(): RegistrationFormValue {
  return {
    division: "",
    team_name: "",
    players: [
      createEmptyPlayer(1, true),
      createEmptyPlayer(2),
      createEmptyPlayer(3),
    ],
    privacy_agreed: false,
    rules_agreed: false,
    representative_agreed: false,
    media_agreed: false,
  };
}

interface RegistrationFormProps {
  /** 부문별로 모집이 마감되었는지 여부 (마감된 부문은 선택 불가로 표시) */
  divisionFullMap?: Partial<Record<Division, boolean>>;
}

export function RegistrationForm({ divisionFullMap = {} }: RegistrationFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationFormValue>(() => createInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 동일 신청을 서버에서도 중복 저장하지 않도록, 폼이 처음 만들어질 때 1회 생성해서 재사용
  const clientRequestId = useMemo(() => crypto.randomUUID(), []);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function registerFieldRef(key: string, el: HTMLElement | null) {
    fieldRefs.current[key] = el;
  }

  function updatePlayer(index: number, patch: Partial<PlayerFormValue>) {
    setForm((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  function addPlayer() {
    setForm((prev) => {
      if (prev.players.length >= TOURNAMENT_INFO.teamSizeMax) return prev;
      const nextOrder = prev.players.length + 1;
      return { ...prev, players: [...prev.players, createEmptyPlayer(nextOrder)] };
    });
  }

  function removePlayer(index: number) {
    setForm((prev) => {
      if (prev.players.length <= TOURNAMENT_INFO.teamSizeMin) return prev;
      const players = prev.players
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, player_order: i + 1, is_representative: i === 0 }));
      return { ...prev, players };
    });
  }

  function buildOrderedFieldKeys(playerCount: number): string[] {
    const keys = ["division", "team_name"];
    for (let i = 0; i < playerCount; i++) {
      keys.push(
        `players.${i}.player_name`,
        `players.${i}.school_name`,
        `players.${i}.grade`,
        `players.${i}.phone`
      );
    }
    keys.push("privacy_agreed", "rules_agreed", "representative_agreed");
    return keys;
  }

  function scrollToField(key: string) {
    const el = fieldRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof (el as HTMLElement).focus === "function") {
        (el as HTMLElement).focus({ preventScroll: true });
      }
    }
  }

  function validate(): boolean {
    const representative = form.players[0];
    const payload = {
      client_request_id: clientRequestId,
      division: form.division,
      team_name: form.team_name.trim(),
      representative_name: representative?.player_name.trim() ?? "",
      representative_phone: representative?.phone.trim() ?? "",
      privacy_agreed: form.privacy_agreed,
      rules_agreed: form.rules_agreed,
      representative_agreed: form.representative_agreed,
      media_agreed: form.media_agreed,
      players: form.players.map((p) => ({
        player_order: p.player_order,
        player_name: p.player_name.trim(),
        school_name: p.school_name.trim(),
        grade: p.grade,
        phone: p.phone.trim(),
        is_representative: p.is_representative,
      })),
    };

    const result = registrationSchema.safeParse(payload);

    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      let key = issue.path.join(".");
      // 대표자 이름/연락처는 화면에는 "선수1" 입력란으로만 노출되므로 해당 필드로 매핑
      if (key === "representative_name") key = "players.0.player_name";
      if (key === "representative_phone") key = "players.0.phone";
      if (!nextErrors[key]) nextErrors[key] = issue.message;
    }
    setErrors(nextErrors);

    const ordered = buildOrderedFieldKeys(form.players.length);
    const firstKey =
      ordered.find((k) => nextErrors[k]) ?? Object.keys(nextErrors)[0];
    if (firstKey) {
      // 체크박스 3개는 개별 ref가 없으므로 division 처럼 컨테이너 ref로 스크롤
      requestAnimationFrame(() => scrollToField(firstKey));
    }

    return false;
  }

  function handleSubmitClick() {
    setSubmitError(null);
    const ok = validate();
    if (ok) setShowConfirm(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);

    const representative = form.players[0];

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_request_id: clientRequestId,
          division: form.division,
          team_name: form.team_name.trim(),
          representative_name: representative.player_name.trim(),
          representative_phone: representative.phone.trim(),
          privacy_agreed: form.privacy_agreed,
          rules_agreed: form.rules_agreed,
          representative_agreed: form.representative_agreed,
          media_agreed: form.media_agreed,
          players: form.players.map((p) => ({
            player_order: p.player_order,
            player_name: p.player_name.trim(),
            school_name: p.school_name.trim(),
            grade: Number(p.grade),
            phone: p.phone.trim(),
            is_representative: p.is_representative,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "SUBMIT_FAILED");
      }

      router.push("/complete");
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "참가신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setSubmitting(false);
    }
  }

  const currentCount = form.players.length;
  const canAddMore = currentCount < TOURNAMENT_INFO.teamSizeMax;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      <StepIndicator current={showConfirm ? 3 : 1} />

      {submitError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </div>
      )}

      {/* 01 팀 정보 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900">01 팀 정보</h2>

        <div className="mt-4">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            참가부문 <span className="text-red-500">*</span>
          </span>
          <div
            ref={(el) => registerFieldRef("division", el)}
            className="grid grid-cols-2 gap-3"
            tabIndex={-1}
          >
            {TOURNAMENT_INFO.divisions.map((d) => {
              const isFull = Boolean(divisionFullMap[d as Division]);
              const isSelected = form.division === d;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isFull}
                  onClick={() => {
                    if (isFull) return;
                    setForm((prev) => ({ ...prev, division: d as Division }));
                  }}
                  className={`rounded-xl border-2 py-4 text-base font-semibold transition ${
                    isFull
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                      : isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600"
                  }`}
                >
                  {d}
                  {isFull ? (
                    <span className="ml-1.5 text-xs font-semibold text-rose-500">모집마감</span>
                  ) : (
                    <span className="ml-1.5 text-xs font-medium text-brand-500">신청가능</span>
                  )}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.division} />
        </div>

        <div className="mt-4">
          <label htmlFor="team_name" className="mb-1 block text-sm font-medium text-slate-700">
            팀명 <span className="text-red-500">*</span>
          </label>
          <input
            id="team_name"
            ref={(el) => registerFieldRef("team_name", el)}
            type="text"
            value={form.team_name}
            onChange={(e) => setForm((prev) => ({ ...prev, team_name: e.target.value }))}
            placeholder="YJ BASKET"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <FieldError message={errors.team_name} />
        </div>
      </section>

      {/* 02 선수 등록 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">02 선수 등록</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            현재 등록선수 {currentCount} / {TOURNAMENT_INFO.teamSizeMax}명
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {form.players.map((player, index) => (
            <PlayerCard
              key={player.key}
              index={index}
              player={player}
              onChange={updatePlayer}
              onRemove={index >= TOURNAMENT_INFO.teamSizeMin ? removePlayer : undefined}
              errors={errors}
              registerFieldRef={registerFieldRef}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addPlayer}
          disabled={!canAddMore}
          className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + 선수 추가
        </button>
      </section>

      {/* 03 동의 및 확인 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900">03 동의 및 확인</h2>

        <AgreementItem
          id="privacy_agreed"
          checked={form.privacy_agreed}
          onChange={(checked) => setForm((prev) => ({ ...prev, privacy_agreed: checked }))}
          registerFieldRef={registerFieldRef}
          error={errors.privacy_agreed}
          title="[필수] 개인정보 수집 및 이용 동의"
        >
          <p>수집목적: 3x3 농구대회 참가자 관리 및 대회 운영</p>
          <p>수집항목: 참가부문, 팀명, 선수 이름, 학교명, 학년, 연락처 등 참가신청 및 대회 운영에 필요한 정보</p>
          <p>보유기간: 대회 종료 및 관련 행정업무 완료 후 관련 규정에 따라 처리</p>
        </AgreementItem>

        <AgreementItem
          id="rules_agreed"
          checked={form.rules_agreed}
          onChange={(checked) => setForm((prev) => ({ ...prev, rules_agreed: checked }))}
          registerFieldRef={registerFieldRef}
          error={errors.rules_agreed}
          title="[필수] 대회 운영요강 확인"
        >
          <p>대회 운영요강 및 참가 유의사항을 확인하였습니다.</p>
        </AgreementItem>

        <AgreementItem
          id="representative_agreed"
          checked={form.representative_agreed}
          onChange={(checked) => setForm((prev) => ({ ...prev, representative_agreed: checked }))}
          registerFieldRef={registerFieldRef}
          error={errors.representative_agreed}
          title="[필수] 대표자 확인"
        >
          <p>참가선수 전원의 동의를 받아 팀 대표자가 참가신청서를 작성하였습니다.</p>
        </AgreementItem>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4 sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={handleSubmitClick}
            className="w-full rounded-xl bg-brand-600 py-4 text-base font-bold text-white shadow-md active:scale-[0.99]"
          >
            참가신청 하기
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          value={form}
          submitting={submitting}
          errorMessage={submitError}
          onEdit={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function AgreementItem({
  id,
  checked,
  onChange,
  registerFieldRef,
  error,
  title,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  registerFieldRef: (key: string, el: HTMLElement | null) => void;
  error?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          ref={(el) => registerFieldRef(id, el)}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
        />
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </label>
      <div className="mt-2 space-y-0.5 pl-8 text-xs leading-relaxed text-slate-500">{children}</div>
      <div className="pl-8">
        <FieldError message={error} />
      </div>
    </div>
  );
}
