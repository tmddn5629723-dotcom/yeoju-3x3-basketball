"use client";

import { useState } from "react";

interface PromoMaterialsProps {
  posterUrl: string | null;
  guidelinesUrl: string | null;
}

export function PromoMaterials({ posterUrl, guidelinesUrl }: PromoMaterialsProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

  return (
    <section className="mx-auto max-w-2xl px-4 pt-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-slate-800">대회 홍보자료</h2>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 홍보포스터 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">홍보포스터</p>
            {posterUrl ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="block w-full overflow-hidden rounded-xl border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterUrl}
                    alt="대회 홍보포스터"
                    className="h-48 w-full object-cover sm:h-56"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-600"
                >
                  홍보포스터 크게보기
                </button>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-400 sm:h-56">
                홍보포스터 준비 중
              </div>
            )}
          </div>

          {/* 대회 운영요강 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">대회 운영요강</p>
            {guidelinesUrl ? (
              <a
                href={guidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-brand-700 sm:h-56"
              >
                <span className="text-3xl">📄</span>
                대회 운영요강 PDF 보기
              </a>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-400 sm:h-56">
                대회 운영요강 준비 중
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomOpen && posterUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            닫기 ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt="대회 홍보포스터 확대"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
