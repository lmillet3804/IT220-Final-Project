import { NextResponse } from "next/server";
import { advancePhase } from "@/lib/game-store";

export async function POST() {
  try {
    advancePhase();
    const response = NextResponse.json({ ok: true });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to advance phase.";
    const response = NextResponse.json({ ok: false, message }, { status: 400 });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    );
    return response;
  }
}
