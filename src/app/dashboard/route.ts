import { NextResponse } from "next/server";

// The OAuth callbacks redirect back to /dashboard; this app is single-page,
// so forward to / while preserving query params (e.g. ?error=x_connect).
export function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.redirect(new URL(`/${u.search}`, u.origin));
}
