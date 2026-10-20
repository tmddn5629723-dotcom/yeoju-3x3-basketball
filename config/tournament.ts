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
  // (기본값) 실제 표시되는 대회명은 관리자 페이지 > 신청페이지 관리 > 대회 기본정보의
  // tournament_title 값이 우선합니다. 아래 값은 DB 조회가 실패했을 때만 쓰이는 예비값입니다.
  fullTitle: "2026 여주시청소년스포츠대전 3x3 농구대회",

  teamSizeMin: 3,
  teamSizeMax: 5,
  teamSizeLabel: "최소 3명 ~ 최대 5명",

  divisions: ["중등부", "고등부"] as const,

  // 기관 로고 이미지 경로 (public 폴더에 파일을 넣고 경로만 바꾸면 됩니다)
  // 예: "/images/logo.png"
  logoImagePath: null as string | null,
  // (사용 중단) 대회 홍보포스터는 더 이상 이 값을 사용하지 않습니다.
  // 관리자 페이지(/admin/materials > 신청페이지 관리)에서 업로드하면 Supabase Storage에 저장되어
  // 참가신청 페이지에 실시간으로 표시됩니다 (components/registration/PromoMaterials.tsx 참고).
  posterImagePath: null as string | null,

  organizerName: "여주시청소년수련관",
} as const;

export type Division = (typeof TOURNAMENT_INFO.divisions)[number];

/**
 * 대회 일정/장소/정원 등 "실제 운영 정보"의 기본값(fallback)입니다.
 * 실제 운영 중인 값은 Supabase의 event_settings 테이블(관리자 페이지 > 신청페이지 관리에서 수정 가능)이
 * 항상 우선하며, 이 값은 DB 조회가 실패했을 때 또는 최초 마이그레이션 직후 보여줄 초기값으로만 쓰입니다.
 */
export const DEFAULT_EVENT_SETTINGS = {
  tournament_title: "2026 여주시청소년스포츠대전 3x3 농구대회",
  intro_text: null as string | null,
  recruitment_start: "2026-10-20",
  recruitment_end: "2026-11-13",
  event_date: "2026-11-21",
  event_time: "13:00",
  event_location: "여주시청소년수련관",
  fee_label: "무료",
  notice_text: null as string | null,
  guidance_text: null as string | null,
  show_notice: true,
  registration_status: "접수중" as const,
};

export const DEFAULT_DIVISION_CAPACITY: Record<Division, number> = {
  중등부: 5,
  고등부: 5,
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026년 11월 21일(토)" 형식 (완전한 연/월/일 + 한글 요일) */
export function formatKoreanDateLong(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY_KO[d.getDay()]})`;
}

/** "2026. 10. 20.(화)" 형식 (모집기간 표기용) */
export function formatKoreanDateDotted(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.(${WEEKDAY_KO[d.getDay()]})`;
}

/** "11. 13.(금)" 형식 (연도 생략, 모집기간 종료일처럼 같은 해의 두 번째 날짜 표기용) */
export function formatKoreanDateDottedShort(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}. ${d.getDate()}.(${WEEKDAY_KO[d.getDay()]})`;
}

/** 모집기간 표시 문자열. 예: "2026. 10. 20.(화) ~ 11. 13.(금)" */
export function formatRecruitmentPeriodLabel(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const startLabel = formatKoreanDateDotted(start);
  const endLabel = formatKoreanDateDottedShort(end);
  if (!startLabel || !endLabel) return "추후 공지";
  return `${startLabel} ~ ${endLabel}`;
}

/** 대회일시 표시 문자열. 예: "2026년 11월 21일(토) 13:00" */
export function formatEventDateTimeLabel(
  date: string | null | undefined,
  time: string | null | undefined
): string {
  const dateLabel = formatKoreanDateLong(date);
  if (!dateLabel) return "추후 공지";
  return time ? `${dateLabel} ${time}` : dateLabel;
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
