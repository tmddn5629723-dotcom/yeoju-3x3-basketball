/**
 * Supabase Storage 공개 버킷("basketball-assets")에 저장된 파일의
 * 공개 다운로드 URL을 만들어주는 유틸리티입니다.
 *
 * basketball-assets 버킷은 public 버킷으로 생성되어 있어서(마이그레이션 0003 참고),
 * 별도의 서명(signed URL) 없이 아래 고정 규칙의 URL로 누구나 접근할 수 있습니다.
 * NEXT_PUBLIC_ 환경변수만 사용하므로 서버/클라이언트 어디서나 안전하게 호출할 수 있습니다.
 */
export const BASKETBALL_ASSETS_BUCKET = "basketball-assets";

export function getPublicAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;

  return `${baseUrl}/storage/v1/object/public/${BASKETBALL_ASSETS_BUCKET}/${path}`;
}
