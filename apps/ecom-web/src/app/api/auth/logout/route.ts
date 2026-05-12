import { NextResponse } from 'next/server';
import { clearSessionCookieOptions } from '@/lib/auth';

export function POST(): NextResponse {
  const opts = clearSessionCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}
