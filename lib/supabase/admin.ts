import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * service_role key를 사용하는 "서버 전용" 관리 클라이언트입니다.
 *
 * 절대 클라이언트 컴포넌트나 브라우저로 전송되는 코드에서 import 하지 마세요.
 * ("server-only" 패키지가 클라이언트 번들에 포함되면 빌드 오류를 발생시켜 이를 방지합니다.)
 *
 * 용도: /complete 페이지에서, 서명된 쿠키로 신원이 확인된 "본인 신청 1건"만
 * 조회하기 위한 목적으로만 사용합니다. RLS를 우회하는 키이므로 다른 용도로
 * 확장하지 않도록 주의하세요.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
