import { NextRequest, NextResponse } from "next/server";
import { getPublicState } from "@/lib/game-store";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId") ?? undefined;
  return NextResponse.json(getPublicState(playerId));
}
