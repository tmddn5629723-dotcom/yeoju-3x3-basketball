"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PhoneInput } from "@/components/registration/PhoneInput";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PHONE_REGEX } from "@/lib/validation";
import {
  TOURNAMENT_INFO,
  TEAM_STATUS,
  type TeamStatus,
  type Division,
} from "@/config/tournament";
import type { PlayerRow, TeamRow } from "@/types/database";

interface EditablePlayer {
  key: string;
  id: string | null; // 기존 선수는 id가 있고, 새로 추가한 선수는 null
  player_name: string;
  grade: string;
  phone: string;
}

function toEditable(players: PlayerRow[]): EditablePlayer[] {
  return players
    .slice()
    .sort((a, b) => a.player_order - b.player_order)
    .map((p) => ({
      key: p.id,
      id: p.id,
      player_name: p.player_name,
      grade: String(p.grade),
      phone: p.phone,
    }));
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function TeamDetailClient({
  team: initialTeam,
  players: initialPlayers,
}: {
  team: TeamRow;
  players: PlayerRow[];
}) {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [players, setPlayers] = useState(initialPlayers);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [division, setDivision] = useState<Division>(team.division);
  const [schoolName, setSchoolName] = useState(team.school_name);
  const [teamName, setTeamName] = useState(team.team_name);
  const [status, setStatus] = useState<TeamStatus>(team.status);
  const [editablePlayers, setEditablePlayers] = useState<EditablePlayer[]>(() =>
    toEditable(initialPlayers)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sortedPlayers = useMemo(
    () => players.slice().sort((a, b) => a.player_order - b.player_order),
    [players]
  );

  function startEdit() {
    setDivision(team.division);
    setSchoolName(team.school_name);
    setTeamName(team.team_name);
    setStatus(team.status);
    setEditablePlayers(toEditable(players));
    setFieldErrors({});
    setError(null);
    setMode("edit");
  }

  function updateEditablePlayer(index: number, patch: Partial<EditablePlayer>) {
    setEditablePlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addEditablePlayer() {
    setEditablePlayers((prev) => {
      if (prev.length >= TOURNAMENT_INFO.teamSizeMax) return prev;
      return [...prev, { key: crypto.randomUUID(), id: null, player_name: "", grade: "", phone: "" }];
    });
  }

  function removeEditablePlayer(index: number) {
    setEditablePlayers((prev) => {
      if (prev.length <= TOURNAMENT_INFO.teamSizeMin) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function validateEdit(): boolean {
    const errors: Record<string, string> = {};

    if (!schoolName.trim()) errors.school_name = "학교명을 입력해주세요.";
    if (!teamName.trim()) errors.team_name = "팀명을 입력해주세요.";

    editablePlayers.forEach((p, i) => {
      if (!p.player_name.trim()) errors[`players.${i}.player_name`] = "이름을 입력해주세요.";
      if (!p.grade) errors[`players.${i}.grade`] = "학년을 선택해주세요.";
      if (!PHONE_REGEX.test(p.phone.trim())) {
        errors[`players.${i}.phone`] = "연락처 형식이 올바르지 않습니다.";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    setError(null);
    if (!validateEdit()) return;

    setSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const originalIds = new Set(players.map((p) => p.id));
      const keptIds = new Set(editablePlayers.filter((p) => p.id).map((p) => p.id as string));
      const removedIds = Array.from(originalIds).filter((id) => !keptIds.has(id));

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("players")
          .delete()
          .in("id", removedIds);
        if (deleteError) throw deleteError;
      }

      for (let i = 0; i < editablePlayers.length; i++) {
        const p = editablePlayers[i];
        const isRepresentative = i === 0;
        const commonFields = {
          player_order: i + 1,
          player_name: p.player_name.trim(),
          grade: Number(p.grade),
          phone: p.phone.trim(),
          is_representative: isRepresentative,
        };

        if (p.id) {
          const { error: updateError } = await supabase
            .from("players")
            .update(commonFields)
            .eq("id", p.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("players")
            .insert({ team_id: team.id, ...commonFields });
          if (insertError) throw insertError;
        }
      }

      const representativePlayer = editablePlayers[0];

      const { data: updatedTeam, error: teamUpdateError } = await supabase
        .from("teams")
        .update({
          division,
          school_name: schoolName.trim(),
          team_name: teamName.trim(),
          player_count: editablePlayers.length,
          representative_name: representativePlayer.player_name.trim(),
          representative_phone: representativePlayer.phone.trim(),
          status,
        })
        .eq("id", team.id)
        .select("*")
        .single();

      if (teamUpdateError) throw teamUpdateError;

      const { data: refreshedPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", team.id)
        .order("player_order", { ascending: true });

      setTeam(updatedTeam as TeamRow);
      setPlayers((refreshedPlayers ?? []) as PlayerRow[]);
      setMode("view");
    } catch {
      setError("수정 내용을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChangeInView(nextStatus: TeamStatus) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: updateError } = await supabase
      .from("teams")
      .update({ status: nextStatus })
      .eq("id", team.id)
      .select("*")
      .single();

    if (updateError) {
      setError("신청상태를 변경하지 못했습니다.");
      return;
    }

    setTeam(data as TeamRow);
    setStatus(nextStatus);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("teams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", team.id);

    if (deleteError) {
      setError("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
      setShowDelete(false);
      return;
    }

    router.push("/admin/teams");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-brand-600">{team.registration_number}</p>
          <h1 className="text-lg font-bold text-slate-900">{team.team_name}</h1>
        </div>
        {mode === "view" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              수정하기
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {mode === "view" ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="접수번호" value={team.registration_number} />
              <Row label="접수일시" value={formatDateTime(team.created_at)} />
              <Row label="참가부문" value={team.division} />
              <Row label="학교명" value={team.school_name} />
              <Row label="팀명" value={team.team_name} />
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">신청상태</dt>
                <dd>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChangeInView(e.target.value as TeamStatus)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    {TEAM_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800">대표자 정보</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="대표자" value={team.representative_name} />
              <Row label="대표자 연락처" value={team.representative_phone} />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800">전체 선수 명단</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {sortedPlayers.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">
                    {i + 1}. {p.player_name} / {p.grade}학년 / {p.phone}
                    {p.is_representative ? " / 대표자" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800">동의 여부</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <Row label="개인정보 동의" value={team.privacy_agreed ? "동의" : "미동의"} />
              <Row label="운영요강 확인" value={team.rules_agreed ? "확인" : "미확인"} />
              <Row label="대표자 확인" value={team.representative_agreed ? "확인" : "미확인"} />
            </dl>
          </section>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800">팀 정보</h2>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">참가부문</label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value as Division)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {TOURNAMENT_INFO.divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">신청상태</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TeamStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {TEAM_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">학교명</label>
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.school_name && (
                  <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.school_name}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">팀명</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.team_name && (
                  <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.team_name}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">선수 명단</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {editablePlayers.length} / {TOURNAMENT_INFO.teamSizeMax}명
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {editablePlayers.map((p, i) => (
                <div key={p.key} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      선수 {i + 1}
                      {i === 0 ? " (대표자)" : ""}
                    </span>
                    {editablePlayers.length > TOURNAMENT_INFO.teamSizeMin && (
                      <button
                        type="button"
                        onClick={() => removeEditablePlayer(i)}
                        className="text-xs font-medium text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <input
                        value={p.player_name}
                        onChange={(e) => updateEditablePlayer(i, { player_name: e.target.value })}
                        placeholder="이름"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      {fieldErrors[`players.${i}.player_name`] && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {fieldErrors[`players.${i}.player_name`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <select
                        value={p.grade}
                        onChange={(e) => updateEditablePlayer(i, { grade: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">학년</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                      {fieldErrors[`players.${i}.grade`] && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {fieldErrors[`players.${i}.grade`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <PhoneInput
                        id={`edit-phone-${p.key}`}
                        value={p.phone}
                        onChange={(value) => updateEditablePlayer(i, { phone: value })}
                      />
                      {fieldErrors[`players.${i}.phone`] && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {fieldErrors[`players.${i}.phone`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addEditablePlayer}
              disabled={editablePlayers.length >= TOURNAMENT_INFO.teamSizeMax}
              className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-40"
            >
              + 선수 추가
            </button>
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      )}

      {showDelete && (
        <DeleteConfirmDialog
          message={`${team.registration_number} / ${team.team_name} 팀의 참가신청을 삭제하시겠습니까?`}
          loading={deleting}
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}
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
