"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BASKETBALL_ASSETS_BUCKET, getPublicAssetUrl } from "@/lib/storage";
import type { Division } from "@/config/tournament";
import type { EventSettingsRow, RegistrationStatus } from "@/types/database";

const POSTER_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const POSTER_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"];

function fileExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

interface PageSettingsManagerProps {
  /** 소프트삭제·참가취소를 제외한 부문별 "현재 신청 팀 수" (서버에서 미리 계산해서 내려줍니다) */
  currentCounts: Record<Division, number>;
}

export function PageSettingsManager({ currentCounts }: PageSettingsManagerProps) {
  const [settings, setSettings] = useState<EventSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 대회 기본정보 + 일정
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [feeLabel, setFeeLabel] = useState("");
  const [introText, setIntroText] = useState("");
  const [recruitmentStart, setRecruitmentStart] = useState("");
  const [recruitmentEnd, setRecruitmentEnd] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // 참가신청 설정
  const [middleMax, setMiddleMax] = useState("5");
  const [highMax, setHighMax] = useState("5");
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // 페이지 콘텐츠
  const [noticeText, setNoticeText] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const [guidanceText, setGuidanceText] = useState("");
  const [contentSaving, setContentSaving] = useState(false);

  // 홍보자료
  const [posterUploading, setPosterUploading] = useState(false);
  const [guidelinesUploading, setGuidelinesUploading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const guidelinesInputRef = useRef<HTMLInputElement | null>(null);

  function applySettingsToForm(row: EventSettingsRow) {
    setSettings(row);
    setTitle(row.tournament_title ?? "");
    setEventDate(row.event_date ?? "");
    setEventTime(row.event_time ?? "");
    setEventLocation(row.event_location ?? "");
    setFeeLabel(row.fee_label ?? "");
    setIntroText(row.intro_text ?? "");
    setRecruitmentStart(row.recruitment_start ?? "");
    setRecruitmentEnd(row.recruitment_end ?? "");
    setMiddleMax(String(row.middle_max_teams));
    setHighMax(String(row.high_max_teams));
    setNoticeText(row.notice_text ?? "");
    setShowNotice(row.show_notice);
    setGuidanceText(row.guidance_text ?? "");
  }

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

    applySettingsToForm(data as EventSettingsRow);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function flashMessage(text: string) {
    setMessage(text);
    setError(null);
  }

  async function handleInfoSave() {
    if (!title.trim()) {
      setError("대회명을 입력해주세요.");
      return;
    }
    if (!eventLocation.trim()) {
      setError("대회 장소를 입력해주세요.");
      return;
    }
    if (recruitmentStart && recruitmentEnd && recruitmentStart > recruitmentEnd) {
      setError("모집 시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }

    setError(null);
    setMessage(null);
    setInfoSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({
          tournament_title: title.trim(),
          event_date: eventDate || null,
          event_time: eventTime.trim() || null,
          event_location: eventLocation.trim(),
          fee_label: feeLabel.trim() || "무료",
          intro_text: introText.trim() || null,
          recruitment_start: recruitmentStart || null,
          recruitment_end: recruitmentEnd || null,
        })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("대회 기본정보가 저장되었습니다. 참가신청 페이지에 바로 반영됩니다.");
    } catch {
      setError("대회 기본정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setInfoSaving(false);
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

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("부문별 모집정원이 저장되었습니다.");
    } catch {
      setError("모집정원 저장에 실패했습니다.");
    } finally {
      setCapacitySaving(false);
    }
  }

  async function handleStatusChange(nextStatus: RegistrationStatus) {
    if (settings?.registration_status === nextStatus) return;
    const confirmText =
      nextStatus === "접수마감"
        ? "접수를 마감하면 참가신청 페이지에서 신규 신청을 받을 수 없습니다. 계속할까요?"
        : "접수를 다시 시작하면 참가자가 즉시 신청할 수 있습니다. 계속할까요?";
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;

    setError(null);
    setMessage(null);
    setStatusSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({ registration_status: nextStatus })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage(
        nextStatus === "접수중"
          ? "참가신청 접수를 재개했습니다."
          : "참가신청 접수를 마감했습니다."
      );
    } catch {
      setError("접수 상태 변경에 실패했습니다.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleContentSave() {
    setError(null);
    setMessage(null);
    setContentSaving(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data: updated, error: updateError } = await supabase
        .from("event_settings")
        .update({
          notice_text: noticeText.trim() || null,
          show_notice: showNotice,
          guidance_text: guidanceText.trim() || null,
        })
        .eq("id", 1)
        .select("*")
        .single();
      if (updateError) throw updateError;

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("페이지 콘텐츠가 저장되었습니다. 참가신청 페이지에 바로 반영됩니다.");
    } catch {
      setError("페이지 콘텐츠 저장에 실패했습니다.");
    } finally {
      setContentSaving(false);
    }
  }

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

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("홍보포스터가 업로드되었습니다.");

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

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("홍보포스터를 삭제했습니다.");
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

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("대회 운영요강 PDF가 업로드되었습니다.");

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

      applySettingsToForm(updated as EventSettingsRow);
      flashMessage("대회 운영요강을 삭제했습니다.");
      await supabase.storage.from(BASKETBALL_ASSETS_BUCKET).remove([previousPath]);
    } catch {
      setError("대회 운영요강 삭제에 실패했습니다.");
    } finally {
      setGuidelinesUploading(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">불러오는 중...</p>;
  }

  const posterUrl = getPublicAssetUrl(settings?.poster_path);
  const guidelinesUrl = getPublicAssetUrl(settings?.guidelines_path);
  const isOpen = settings?.registration_status === "접수중";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">신청페이지 관리</h1>
        <p className="text-sm text-slate-500">
          여기서 저장하면 코드 수정이나 재배포 없이 참가신청 페이지에 바로 반영됩니다.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {/* 참가신청 접수 상태 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">참가신청 접수 관리</h2>
            <p className="mt-1 text-xs text-slate-500">
              모집기간과 관계없이 이 상태가 참가신청 가능 여부를 직접 결정합니다.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              isOpen ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            현재: {settings?.registration_status ?? "-"}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange("접수중")}
            disabled={statusSaving || isOpen}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            접수중으로 전환
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("접수마감")}
            disabled={statusSaving || !isOpen}
            className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            접수마감으로 전환
          </button>
        </div>
      </section>

      {/* ① 대회 기본정보 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">대회 기본정보</h2>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">대회명</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">모집 시작일</label>
            <input
              type="date"
              value={recruitmentStart}
              onChange={(e) => setRecruitmentStart(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">모집 종료일</label>
            <input
              type="date"
              value={recruitmentEnd}
              onChange={(e) => setRecruitmentEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">대회 개최일</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">대회 시작시간</label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">대회 장소</label>
            <input
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">참가비</label>
            <input
              value={feeLabel}
              onChange={(e) => setFeeLabel(e.target.value)}
              placeholder="무료"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">대회 소개 / 안내 문구</label>
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={3}
              placeholder="참가신청 페이지 상단에 표시할 대회 소개 문구 (선택 입력)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          모집기간은 안내용 표시 문구로만 사용되며, 실제 신청 가능 여부는 위 "참가신청 접수 관리" 상태로 결정됩니다.
        </p>

        <button
          type="button"
          onClick={handleInfoSave}
          disabled={infoSaving}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {infoSaving ? "저장 중..." : "기본정보 저장"}
        </button>
      </section>

      {/* ② 참가신청 관련 설정 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">참가신청 설정 (모집 부문별 정원)</h2>
        <p className="mt-1 text-xs text-slate-500">
          정원에 도달하면 참가신청 페이지에서 해당 부문이 자동으로 모집마감 처리됩니다. (모집 부문 자체는 중등부/고등부로 고정되어 있습니다)
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
            <p className="mt-1 text-xs text-slate-400">현재 신청 {currentCounts.중등부}팀</p>
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
            <p className="mt-1 text-xs text-slate-400">현재 신청 {currentCounts.고등부}팀</p>
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

      {/* ③ 홍보자료 관리 */}
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

      {/* ④ 페이지 콘텐츠 관리 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">페이지 콘텐츠 관리</h2>

        <div className="mt-3 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">공지사항</label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={showNotice}
                  onChange={(e) => setShowNotice(e.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                신청페이지에 표시
              </label>
            </div>
            <textarea
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              rows={3}
              placeholder="예: 10월 20일부터 신청 접수를 시작합니다. (선택 입력)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">참가 안내사항 / 유의사항</label>
            <textarea
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              rows={4}
              placeholder="예: 선수 등록 후 변경은 대회 3일 전까지 관리자에게 연락 바랍니다. (선택 입력)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleContentSave}
          disabled={contentSaving}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {contentSaving ? "저장 중..." : "콘텐츠 저장"}
        </button>
      </section>
    </div>
  );
}
