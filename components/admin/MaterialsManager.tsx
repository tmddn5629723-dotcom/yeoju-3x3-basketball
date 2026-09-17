"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BASKETBALL_ASSETS_BUCKET, getPublicAssetUrl } from "@/lib/storage";
import type { EventSettingsRow } from "@/types/database";

const POSTER_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const POSTER_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"];

function fileExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

export function MaterialsManager() {
  const [settings, setSettings] = useState<EventSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [posterUploading, setPosterUploading] = useState(false);
  const [guidelinesUploading, setGuidelinesUploading] = useState(false);

  const [middleMax, setMiddleMax] = useState("5");
  const [highMax, setHighMax] = useState("5");
  const [capacitySaving, setCapacitySaving] = useState(false);

  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const guidelinesInputRef = useRef<HTMLInputElement | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: fetchError } = await supabase
      .from("event_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (fetchError || !data) {
      setError("설정 정보를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    const row = data as EventSettingsRow;
    setSettings(row);
    setMiddleMax(String(row.middle_max_teams));
    setHighMax(String(row.high_max_teams));
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handlePosterSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);

    const ext = fileExt(file.name);
    if (!POSTER_ALLOWED_TYPES.includes(file.type) && !POSTER_ALLOWED_EXT.includes(ext)) {
      setError("홍보포스터는 JPG, JPEG, PNG, WEBP 형식만 업로드할 수 있습니다.");
      return;
    }

    setPosterUploading(true);
    const supabase = createSupabaseBrowserClient();
    const path = `poster/poster-${Date.now()}.${ext || "jpg"}`;
    const previousPath = settings?.poster_path ?? null;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BASKETBALL_ASSETS_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ poster_path: path })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setSettings(updated as EventSettingsRow);
      setMessage("홍보포스터가 업로드되었습니다.");

      if (previousPath) {
        await supabase.storage.from(BASKETBALL_ASSETS_BUCKET).remove([previousPath]);
      }
    } catch {
      setError("홍보포스터 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPosterUploading(false);
    }
  }

  async function handlePosterDelete() {
    if (!settings?.poster_path) return;
    setError(null);
    setMessage(null);
    setPosterUploading(true);
    const supabase = createSupabaseBrowserClient();
    const previousPath = settings.poster_path;

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ poster_path: null })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setSettings(updated as EventSettingsRow);
      setMessage("홍보포스터를 삭제했습니다.");
      await supabase.storage.from(BASKETBALL_ASSETS_BUCKET).remove([previousPath]);
    } catch {
      setError("홍보포스터 삭제에 실패했습니다.");
    } finally {
      setPosterUploading(false);
    }
  }

  async function handleGuidelinesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);

    if (file.type !== "application/pdf" && fileExt(file.name) !== "pdf") {
      setError("대회 운영요강은 PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    setGuidelinesUploading(true);
    const supabase = createSupabaseBrowserClient();
    const path = `guidelines/guidelines-${Date.now()}.pdf`;
    const previousPath = settings?.guidelines_path ?? null;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BASKETBALL_ASSETS_BUCKET)
        .upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ guidelines_path: path })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setSettings(updated as EventSettingsRow);
      setMessage("대회 운영요강 PDF가 업로드되었습니다.");

      if (previousPath) {
        await supabase.storage.from(BASKETBALL_ASSETS_BUCKET).remove([previousPath]);
      }
    } catch {
      setError("대회 운영요강 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setGuidelinesUploading(false);
    }
  }

  async function handleGuidelinesDelete() {
    if (!settings?.guidelines_path) return;
    setError(null);
    setMessage(null);
    setGuidelinesUploading(true);
    const supabase = createSupabaseBrowserClient();
    const previousPath = settings.guidelines_path;

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ guidelines_path: null })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setSettings(updated as EventSettingsRow);
      setMessage("대회 운영요강을 삭제했습니다.");
      await supabase.storage.from(BASKETBALL_ASSETS_BUCKET).remove([previousPath]);
    } catch {
      setError("대회 운영요강 삭제에 실패했습니다.");
    } finally {
      setGuidelinesUploading(false);
    }
  }

  async function handleCapacitySave() {
    const middle = Number(middleMax);
    const high = Number(highMax);

    if (!Number.isInteger(middle) || middle < 0 || !Number.isInteger(high) || high < 0) {
      setError("모집정원은 0 이상의 정수로 입력해주세요.");
      return;
    }

    setError(null);
    setMessage(null);
    setCapacitySaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ middle_max_teams: middle, high_max_teams: high })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setSettings(updated as EventSettingsRow);
      setMessage("부문별 모집정원이 저장되었습니다.");
    } catch {
      setError("모집정원 저장에 실패했습니다.");
    } finally {
      setCapacitySaving(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">불러오는 중...</p>;
  }

  const posterUrl = getPublicAssetUrl(settings?.poster_path);
  const guidelinesUrl = getPublicAssetUrl(settings?.guidelines_path);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">대회자료 관리</h1>
        <p className="text-sm text-slate-500">
          여기서 교체/삭제하면 참가신청 페이지에 즉시 반영됩니다.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {/* 홍보포스터 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">홍보포스터</h2>
        <p className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, WEBP 형식만 업로드할 수 있습니다.</p>

        <div className="mt-3">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt="홍보포스터 미리보기"
              className="h-56 w-full max-w-sm rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
              등록된 포스터가 없습니다
            </div>
          )}
        </div>

        <input
          ref={posterInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={handlePosterSelect}
          className="hidden"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => posterInputRef.current?.click()}
            disabled={posterUploading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {posterUploading ? "처리 중..." : settings?.poster_path ? "포스터 교체" : "포스터 업로드"}
          </button>
          {settings?.poster_path && (
            <button
              type="button"
              onClick={handlePosterDelete}
              disabled={posterUploading}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              삭제
            </button>
          )}
        </div>
      </section>

      {/* 대회 운영요강 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">대회 운영요강 (PDF)</h2>
        <p className="mt-1 text-xs text-slate-500">PDF 파일만 업로드할 수 있습니다.</p>

        <div className="mt-3">
          {guidelinesUrl ? (
            <a
              href={guidelinesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-brand-700"
            >
              📄 현재 등록된 PDF 보기
            </a>
          ) : (
            <p className="text-sm text-slate-400">등록된 운영요강 PDF가 없습니다</p>
          )}
        </div>

        <input
          ref={guidelinesInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleGuidelinesSelect}
          className="hidden"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => guidelinesInputRef.current?.click()}
            disabled={guidelinesUploading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {guidelinesUploading ? "처리 중..." : settings?.guidelines_path ? "PDF 교체" : "PDF 업로드"}
          </button>
          {settings?.guidelines_path && (
            <button
              type="button"
              onClick={handleGuidelinesDelete}
              disabled={guidelinesUploading}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              삭제
            </button>
          )}
        </div>
      </section>

      {/* 부문별 모집정원 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">부문별 모집정원</h2>
        <p className="mt-1 text-xs text-slate-500">
          정원에 도달하면 참가신청 페이지에서 해당 부문이 자동으로 모집마감 처리됩니다.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">중등부 정원(팀)</label>
            <input
              type="number"
              min={0}
              value={middleMax}
              onChange={(e) => setMiddleMax(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">고등부 정원(팀)</label>
            <input
              type="number"
              min={0}
              value={highMax}
              onChange={(e) => setHighMax(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCapacitySave}
          disabled={capacitySaving}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {capacitySaving ? "저장 중..." : "정원 저장"}
        </button>
      </section>
    </div>
  );
}
