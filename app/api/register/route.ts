import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { registrationSchema } from "@/lib/validation";
import { createReceiptToken, RECEIPT_COOKIE_NAME, RECEIPT_COOKIE_MAX_AGE } from "@/lib/receiptCookie";
import type { RegisterTeamPayload, RegisterTeamResult } from "@/types/database";

// 참가신청은 로그인 없이 누구나 호출하므로 anon key 로 별도의 클라이언트를 만든다.
// (쿠키 기반 세션이 필요 없는 단순 공개 API)
function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
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
    school_name: input.school_name,
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
      grade: p.grade,
      phone: p.phone,
      is_representative: p.is_representative,
    })),
  };

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.rpc("register_team", { payload });

    if (error) {
      // 개인정보(이름/연락처 등)가 포함될 수 있으므로 상세 payload는 절대 로그로 남기지 않는다.
      console.error("register_team RPC error:", error.code, error.message);
      return NextResponse.json({ success: false, message: "SAVE_FAILED" }, { status: 500 });
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
    return NextResponse.json({ success: false, message: "SAVE_FAILED" }, { status: 500 });
  }
}
