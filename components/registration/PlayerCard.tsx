"use client";

import { PhoneInput } from "./PhoneInput";
import { FieldError } from "@/components/ui/FieldError";
import type { PlayerFormValue } from "@/types/database";

interface PlayerCardProps {
  index: number;
  player: PlayerFormValue;
  onChange: (index: number, patch: Partial<PlayerFormValue>) => void;
  onRemove?: (index: number) => void;
  errors: Record<string, string>;
  registerFieldRef: (key: string, el: HTMLElement | null) => void;
}

export function PlayerCard({
  index,
  player,
  onChange,
  onRemove,
  errors,
  registerFieldRef,
}: PlayerCardProps) {
  const prefix = `players.${index}`;
  const label = player.is_representative ? `선수 ${index + 1} (팀 대표자)` : `선수 ${index + 1}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">{label}</h3>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-sm font-medium text-red-500 hover:text-red-600"
          >
            삭제
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor={`${prefix}.name`} className="mb-1 block text-sm font-medium text-slate-700">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id={`${prefix}.name`}
            ref={(el) => registerFieldRef(`${prefix}.player_name`, el)}
            type="text"
            value={player.player_name}
            onChange={(e) => onChange(index, { player_name: e.target.value })}
            placeholder="홍길동"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <FieldError message={errors[`${prefix}.player_name`]} />
        </div>

        <div>
          <label htmlFor={`${prefix}.grade`} className="mb-1 block text-sm font-medium text-slate-700">
            학년 <span className="text-red-500">*</span>
          </label>
          <select
            id={`${prefix}.grade`}
            ref={(el) => registerFieldRef(`${prefix}.grade`, el)}
            value={player.grade}
            onChange={(e) => onChange(index, { grade: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">선택</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <FieldError message={errors[`${prefix}.grade`]} />
        </div>

        <div>
          <label htmlFor={`${prefix}.phone`} className="mb-1 block text-sm font-medium text-slate-700">
            연락처 <span className="text-red-500">*</span>
          </label>
          <PhoneInput
            id={`${prefix}.phone`}
            ref={(el) => registerFieldRef(`${prefix}.phone`, el)}
            value={player.phone}
            onChange={(value) => onChange(index, { phone: value })}
          />
          <FieldError message={errors[`${prefix}.phone`]} />
        </div>
      </div>

      {player.is_representative && (
        <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
          대회 참가확정 및 주요 안내사항은 팀 대표자 연락처로 안내됩니다.
        </p>
      )}
    </div>
  );
}
