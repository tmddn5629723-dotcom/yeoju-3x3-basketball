/**
 * 대회 기본정보 설정 파일
 *
 * 이 파일의 값만 수정하면 참가신청 페이지, 신청완료 페이지, 관리자 페이지 등
 * 사이트 전체에 표시되는 대회 정보가 함께 바뀝니다.
 * (컴포넌트 코드를 직접 건드릴 필요가 없습니다.)
 */

export const TOURNAMENT_INFO = {
  year: 2026,
  title: "2026 여주시청소년스포츠대전",
  subtitle: "3x3 농구대회",
  fullTitle: "2026 여주시청소년스포츠대전 3x3 농구대회",

  // 대회 일시 (사람이 읽는 표시용 문자열)
  dateLabel: "2026년 10월 24일(토)",
  // 실제 날짜 (신청기간 계산 등에 사용 가능)
  eventDate: "2026-10-24",

  locationLabel: "여주시청소년수련관",

  feeLabel: "무료",

  teamSizeMin: 3,
  teamSizeMax: 5,
  teamSizeLabel: "최소 3명 ~ 최대 5명",

  divisions: ["중등부", "고등부"] as const,

  // 참가신청 기간 - 이 값만 수정하면 신청 가능 여부가 자동으로 반영됩니다.
  // ISO 형식(YYYY-MM-DDTHH:mm:ss) 로컬 시간 기준
  applicationPeriod: {
    start: "2026-09-01T00:00:00",
    end: "2026-10-17T23:59:59",
  },

  // 기관 로고 / 대회 포스터 이미지 경로 (public 폴더에 파일을 넣고 경로만 바꾸면 됩니다)
  // 예: "/images/logo.png", "/images/poster.jpg"
  logoImagePath: null as string | null,
  posterImagePath: null as string | null,

  organizerName: "여주시청소년수련관",
} as const;

export type Division = (typeof TOURNAMENT_INFO.divisions)[number];

export function isApplicationOpen(now: Date = new Date()): boolean {
  const start = new Date(TOURNAMENT_INFO.applicationPeriod.start);
  const end = new Date(TOURNAMENT_INFO.applicationPeriod.end);
  return now >= start && now <= end;
}

export const TEAM_STATUS = ["접수", "참가확정", "대기", "참가취소"] as const;
export type TeamStatus = (typeof TEAM_STATUS)[number];

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  접수: "접수",
  참가확정: "참가확정",
  대기: "대기",
  참가취소: "참가취소",
};

export const TEAM_STATUS_BADGE_CLASS: Record<TeamStatus, string> = {
  접수: "bg-slate-100 text-slate-700 border-slate-300",
  참가확정: "bg-emerald-50 text-emerald-700 border-emerald-300",
  대기: "bg-amber-50 text-amber-700 border-amber-300",
  참가취소: "bg-rose-50 text-rose-700 border-rose-300",
};
