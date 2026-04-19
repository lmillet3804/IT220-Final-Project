import { NextRequest, NextResponse } from "next/server";
import { joinGame } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string; name?: string };
    const player = joinGame(body.code ?? "", body.name ?? "");
    return NextResponse.json({ ok: true, player });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
