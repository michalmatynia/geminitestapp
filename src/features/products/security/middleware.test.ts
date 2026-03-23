import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import { addSecurityHeaders } from './middleware';

describe('addSecurityHeaders', () => {
  it('allows inline caption tracks through media-src', () => {
    const response = NextResponse.json({ ok: true });

    addSecurityHeaders(response);

    expect(response.headers.get('Content-Security-Policy')).toContain("media-src 'self' data:");
  });
});
