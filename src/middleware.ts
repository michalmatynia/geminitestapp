import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/features/auth/server";
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from "@/shared/lib/security/csrf";

const middleware = auth((request: NextRequest) => {
  const response = NextResponse.next();
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
});

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
