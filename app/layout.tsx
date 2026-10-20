import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TOURNAMENT_INFO, DEFAULT_EVENT_SETTINGS, formatEventDateTimeLabel } from "@/config/tournament";

// 검색엔진/링크 미리보기용 설명문구입니다. 실제 화면에 보이는 대회일시/장소는
// 관리자 페이지에서 바뀐 값이 실시간으로 반영되지만, 이 메타 설명은 빌드 시점의 기본값을 사용합니다.
export const metadata: Metadata = {
  title: TOURNAMENT_INFO.fullTitle,
  description: `${TOURNAMENT_INFO.fullTitle} 참가신청 페이지 - ${formatEventDateTimeLabel(
    DEFAULT_EVENT_SETTINGS.event_date,
    DEFAULT_EVENT_SETTINGS.event_time
  )} / ${DEFAULT_EVENT_SETTINGS.event_location}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
