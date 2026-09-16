import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { TOURNAMENT_INFO } from "@/config/tournament";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-center text-xs font-semibold text-brand-600">{TOURNAMENT_INFO.fullTitle}</p>
        <h1 className="mt-1 text-center text-lg font-extrabold text-slate-900">관리자 시스템</h1>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
