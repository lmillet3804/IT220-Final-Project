import { NextRequest, NextResponse } from "next/server";
import { submitGuess } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      guessedStoryId?: string;
    };
    submitGuess(body.playerId ?? "", body.guessedStoryId ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit guess.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
