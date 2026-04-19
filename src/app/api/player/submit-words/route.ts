import { NextRequest, NextResponse } from "next/server";
import { submitWords } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      words?: string[];
    };
    submitWords(body.playerId ?? "", body.words ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit words.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
