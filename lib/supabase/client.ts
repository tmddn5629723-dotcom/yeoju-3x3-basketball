"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트.
 * NEXT_PUBLIC_ 환경변수만 사용하며, anon key 는 RLS 정책에 의해
 * 참가자는 register_team() 함수 호출만 가능하고, 관리자는 로그인 후에만
 * 팀/선수 데이터에 접근할 수 있습니다.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
