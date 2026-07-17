import { NextRequest, NextResponse } from "next/server";

// Keep the Apps Script Web App URL server-side only (set in .env.local),
// never shipped to the browser.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "APPS_SCRIPT_URL is not configured on the server. Add it to .env.local (see README).",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.text();

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
