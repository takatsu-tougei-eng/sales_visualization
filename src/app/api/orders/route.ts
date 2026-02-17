import { NextResponse } from "next/server";
import { getDailySummary } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = getDailySummary();
  return NextResponse.json({ data });
}
