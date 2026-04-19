import { NextResponse } from "next/server";
import { resetGame } from "@/lib/game-store";

export async function POST() {
  const state = resetGame();
  return NextResponse.json({ ok: true, code: state.code });
}
