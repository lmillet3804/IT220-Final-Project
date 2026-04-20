import { NextRequest, NextResponse } from "next/server";
import { submitWords } from "@/lib/game-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      words?: string[];
    };
    submitWords(body.playerId ?? "", body.words ?? []);
    const response = NextResponse.json({ ok: true });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit words.";
    const response = NextResponse.json({ ok: false, message }, { status: 400 });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  }
}
