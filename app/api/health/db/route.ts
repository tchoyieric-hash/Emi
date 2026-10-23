import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const sql = neon(connectionString);
    const rows = await sql`select 1 as ok, current_database() as database, now() as checked_at`;
    return NextResponse.json({ ok: true, database: rows[0]?.database, checkedAt: rows[0]?.checked_at }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
