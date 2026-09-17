import { createClient } from "@supabase/supabase-js";

/**
 * 로그인 세션(쿠키)이 필요 없는 "완전 공개" 요청용 Supabase 클라이언트입니다.
 * anon key만 사용하며, RLS 정책상 anon 역할은 register_team() / get_public_event_status()
 * 같은 안전한 RPC 함수만 호출할 수 있고 테이블에는 직접 접근할 수 없습니다.
 * (참가신청 저장 API, 참가신청 페이지의 실시간 현황 조회 등에서 사용)
 */
export function createSupabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
