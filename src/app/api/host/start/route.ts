import { NextRequest, NextResponse } from "next/server";
import { startGame, type Story } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      stories?: Story[];
      maxRounds?: number;
      roundSeconds?: number;
    };

    startGame({
      stories: body.stories ?? [],
      maxRounds: body.maxRounds ?? 3,
      roundSeconds: body.roundSeconds ?? 60,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start game.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
