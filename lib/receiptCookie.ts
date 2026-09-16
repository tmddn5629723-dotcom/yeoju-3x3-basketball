import "server-only";
import crypto from "node:crypto";

const COOKIE_NAME = "bb2026_receipt";
const MAX_AGE_SECONDS = 60 * 30; // 30분: 새로고침해도 유지되지만 무한정 남지는 않도록 함

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
}

function sign(teamId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(teamId).digest("hex");
}

/**
 * 신청 완료 직후 발급하는 서명된 값(teamId.서명)을 만듭니다.
 * 이 값을 httpOnly 쿠키에 담아두면, 다른 사람이 URL을 직접 조작해서
 * 임의의 접수번호/팀 정보를 조회할 수 없습니다(서명을 알 수 없기 때문).
 */
export function createReceiptToken(teamId: string): string {
  return `${teamId}.${sign(teamId)}`;
}

export function verifyReceiptToken(token: string | undefined): string | null {
  if (!token) return null;
  const [teamId, signature] = token.split(".");
  if (!teamId || !signature) return null;

  const expected = sign(teamId);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);

  if (expectedBuf.length !== actualBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;

  return teamId;
}

export const RECEIPT_COOKIE_NAME = COOKIE_NAME;
export const RECEIPT_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
