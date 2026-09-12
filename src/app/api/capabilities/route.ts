import { NextResponse } from "next/server";
import { getCapabilities } from "@/lib/server/capabilities";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getCapabilities());
}
