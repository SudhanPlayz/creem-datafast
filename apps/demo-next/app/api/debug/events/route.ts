import { NextResponse } from "next/server";

import { listDebugEvents } from "@/lib/debug-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listDebugEvents());
}
