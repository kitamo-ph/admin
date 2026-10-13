import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "kitamo-admin",
      // A production runtime never serves mock data (ADM-016/025, ADM-048).
      mode: process.env.NODE_ENV === "production" ? "core" : "mock",
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    },
  );
}
