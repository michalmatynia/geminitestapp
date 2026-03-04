import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { getCsrfTokenFromHeaders } from '@/shared/lib/security/csrf';

describe('csrf header parsing canonical contract', () => {
  it('returns token from canonical x-csrf-token header', () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'canonical-token',
      },
    });

    expect(getCsrfTokenFromHeaders(request)).toBe('canonical-token');
  });

  it('ignores legacy x-xsrf-token header alias', () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'x-xsrf-token': 'legacy-token',
      },
    });

    expect(getCsrfTokenFromHeaders(request)).toBeNull();
  });
});
