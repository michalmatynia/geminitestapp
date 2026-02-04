import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/features/auth/server";
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from "@/shared/lib/security/csrf";

const baseProxy = (request: NextRequest) => {
  const response = NextResponse.next();
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const handler = typeof auth === "function" ? (auth as any)(baseProxy) : null;

type HandlerContext = typeof handler extends (...args: any[]) => any
  ? Parameters<typeof handler>[1]
  : any;

export function proxy(
  request: NextRequest,
  context?: HandlerContext,
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  if (!handler || typeof handler !== "function") {
    return baseProxy(request);
  }
  return handler(request, resolvedContext) as Promise<Response> | Response;
}

export default proxy;

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
