import { NextRequest, NextResponse } from "next/server";
import { getPublicState } from "@/lib/game-store";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId") ?? undefined;
  const response = NextResponse.json(await getPublicState(playerId));
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
