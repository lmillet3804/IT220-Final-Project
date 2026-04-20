import { NextRequest, NextResponse } from "next/server";
import { joinGame } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string; name?: string };
    const player = joinGame(body.code ?? "", body.name ?? "");
    const response = NextResponse.json({ ok: true, player });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join.";
    const response = NextResponse.json({ ok: false, message }, { status: 400 });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  }
}
