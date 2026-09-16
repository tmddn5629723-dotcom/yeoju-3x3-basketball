import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: Record<string, unknown> };

/**
 * 서버 컴포넌트 / 라우트 핸들러에서 "로그인한 사용자(관리자)"의 권한으로
 * Supabase에 접근할 때 사용하는 클라이언트. anon key + 쿠키의 로그인 세션을
 * 그대로 사용하므로 RLS 정책이 정상적으로 적용됩니다.
 * (서비스 롤 키를 사용하지 않으므로 관리자 페이지에서 주로 이 클라이언트를 사용합니다.)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options as any);
            });
          } catch {
            // 서버 컴포넌트(read-only)에서 호출된 경우 무시 (미들웨어에서 세션이 갱신됨)
          }
        },
      },
    }
  );
}
