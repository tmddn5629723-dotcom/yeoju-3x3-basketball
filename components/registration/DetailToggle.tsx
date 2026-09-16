"use client";

import { useState } from "react";
import type { PlayerRow } from "@/types/database";

export function DetailToggle({ players }: { players: PlayerRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700"
      >
        {open ? "신청내용 접기" : "신청내용 확인"}
      </button>

      {open && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {players
            .slice()
            .sort((a, b) => a.player_order - b.player_order)
            .map((p, i) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-700">
                  {i + 1}. {p.player_name} / {p.grade}학년 / {p.phone}
                  {p.is_representative ? " / 대표자" : ""}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
