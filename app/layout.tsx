import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TOURNAMENT_INFO } from "@/config/tournament";

export const metadata: Metadata = {
  title: TOURNAMENT_INFO.fullTitle,
  description: `${TOURNAMENT_INFO.fullTitle} 참가신청 페이지 - ${TOURNAMENT_INFO.dateLabel} / ${TOURNAMENT_INFO.locationLabel}`,
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
