// @ts-nocheck
// Force logout endpoint to destroy oversized JWT cookies (494 fix)

import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/login?force=494&cleared=true", process.env.NEXTAUTH_URL || "http://localhost:3000")
  );

  // Aggressively clear all possible NextAuth cookies
  const cookiesToClear = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
  ];

  cookiesToClear.forEach((name) => {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      domain: undefined,
    });
  });

  return response;
}

export async function POST() {
  return GET();
}
