import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { TOURNAMENT_INFO } from "@/config/tournament";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-brand-600">{TOURNAMENT_INFO.fullTitle}</p>
            <p className="text-sm font-bold text-slate-900">관리자 시스템</p>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <Link href="/admin" className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-white">
                대시보드
              </Link>
              <Link
                href="/admin/teams"
                className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-white"
              >
                참가팀 관리
              </Link>
              <Link
                href="/admin/materials"
                className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-white"
              >
                대회자료 관리
              </Link>
            </nav>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
