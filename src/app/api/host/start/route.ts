import { NextRequest, NextResponse } from "next/server";
import { startGame, type Story } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      stories?: Story[];
      maxRounds?: number;
      roundSeconds?: number;
    };

    await startGame({
      stories: body.stories ?? [],
      maxRounds: body.maxRounds ?? 3,
      roundSeconds: body.roundSeconds ?? 60,
    });

    const response = NextResponse.json({ ok: true });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start game.";
    const response = NextResponse.json({ ok: false, message }, { status: 400 });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  }
}
