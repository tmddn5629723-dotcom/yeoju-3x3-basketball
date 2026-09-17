import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registrationSchema } from "@/lib/validation";
import { createReceiptToken, RECEIPT_COOKIE_NAME, RECEIPT_COOKIE_MAX_AGE } from "@/lib/receiptCookie";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { RegisterTeamPayload, RegisterTeamResult } from "@/types/database";

/** DB(register_team RPC)가 던지는 예외 코드를 참가자에게 보여줄 문구로 변환 */
function toUserMessage(dbErrorMessage: string | undefined): string {
  switch (dbErrorMessage) {
    case "DIVISION_FULL":
      return "선택하신 참가부문은 방금 모집정원이 마감되었습니다. 다른 부문을 선택하시거나 새로고침 후 다시 확인해주세요.";
    default:
      return "참가신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "VALIDATION_FAILED" },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const payload: RegisterTeamPayload = {
    client_request_id: input.client_request_id,
    division: input.division,
    team_name: input.team_name,
    representative_name: input.representative_name,
    representative_phone: input.representative_phone,
    privacy_agreed: true,
    rules_agreed: true,
    representative_agreed: true,
    media_agreed: input.media_agreed,
    players: input.players.map((p) => ({
      player_order: p.player_order,
      player_name: p.player_name,
      school_name: p.school_name,
      grade: p.grade,
      phone: p.phone,
      is_representative: p.is_representative,
    })),
  };

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("register_team", { payload });

    if (error) {
      // 개인정보(이름/연락처 등)가 포함될 수 있으므로 상세 payload는 절대 로그로 남기지 않는다.
      console.error("register_team RPC error:", error.code, error.message);
      return NextResponse.json(
        { success: false, message: toUserMessage(error.message) },
        { status: error.message === "DIVISION_FULL" ? 409 : 500 }
      );
    }

    const result = data as RegisterTeamResult;

    const cookieStore = await cookies();
    cookieStore.set(RECEIPT_COOKIE_NAME, createReceiptToken(result.team_id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RECEIPT_COOKIE_MAX_AGE,
    });

    return NextResponse.json({
      success: true,
      registration_number: result.registration_number,
    });
  } catch (err) {
    console.error("register_team unexpected error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { success: false, message: toUserMessage(undefined) },
      { status: 500 }
    );
  }
}
