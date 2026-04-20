import { NextResponse } from "next/server";
import { resetGame } from "@/lib/game-store";

export async function POST() {
  const state = await resetGame();
  const response = NextResponse.json({ ok: true, code: state.code });
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  return response;
}
