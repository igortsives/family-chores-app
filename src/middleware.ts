import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== "/app") {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (token as { role?: "ADULT" | "KID" }).role;
  const destination = role === "ADULT" ? "/app/admin/stats" : "/app/my-chores";
  return NextResponse.redirect(new URL(destination, req.url));
}

export const config = {
  matcher: ["/app"],
};
