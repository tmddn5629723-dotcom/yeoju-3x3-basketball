import { z } from "zod";
import { TOURNAMENT_INFO } from "@/config/tournament";

/** 숫자만 입력해도 010-1234-5678 형태로 자동 변환 */
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);

  if (digits.length < 4) return digits;

  if (digits.length < 8) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  if (digits.length <= 10) {
    // 02-xxx-xxxx 등 지역번호 케이스는 이 시스템 특성상 대부분 휴대전화이므로
    // 010 등 3자리 국번 기준으로 통일 처리
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export const PHONE_REGEX = /^01[0-9]-\d{3,4}-\d{4}$/;

export const playerSchema = z.object({
  player_order: z.number().int().min(1).max(5),
  player_name: z.string().trim().min(1, "이름을 입력해주세요."),
  school_name: z.string().trim().min(1, "학교명을 입력해주세요."),
  grade: z.coerce
    .number()
    .int()
    .min(1, "학년을 선택해주세요.")
    .max(3, "학년을 선택해주세요."),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)"),
  is_representative: z.boolean(),
});

export const registrationSchema = z.object({
  client_request_id: z.string().uuid(),
  division: z.enum(TOURNAMENT_INFO.divisions),
  team_name: z.string().trim().min(1, "팀명을 입력해주세요."),
  representative_name: z.string().trim().min(1, "대표자 이름을 입력해주세요."),
  representative_phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "대표자 연락처 형식이 올바르지 않습니다."),
  privacy_agreed: z.literal(true, {
    errorMap: () => ({ message: "개인정보 수집 및 이용에 동의해주세요." }),
  }),
  rules_agreed: z.literal(true, {
    errorMap: () => ({ message: "대회 운영요강 확인에 동의해주세요." }),
  }),
  representative_agreed: z.literal(true, {
    errorMap: () => ({ message: "대표자 확인에 동의해주세요." }),
  }),
  media_agreed: z.boolean().default(false),
  players: z
    .array(playerSchema)
    .min(
      TOURNAMENT_INFO.teamSizeMin,
      `선수는 최소 ${TOURNAMENT_INFO.teamSizeMin}명 이상 등록해야 합니다.`
    )
    .max(
      TOURNAMENT_INFO.teamSizeMax,
      `선수는 최대 ${TOURNAMENT_INFO.teamSizeMax}명까지 등록할 수 있습니다.`
    ),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
