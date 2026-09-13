import { NextResponse } from "next/server";
import { listGenerations } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1), 60);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const { items, hasMore } = listGenerations(limit, offset);
  return NextResponse.json({ items, hasMore, nextOffset: offset + items.length });
}
