import { describe, expect, it } from 'vitest';

import { authConfig } from './auth.config';

const authorized = authConfig.callbacks.authorized;

describe('authConfig.callbacks.authorized', () => {
  it('denies Kangur admin routes without settings.manage permission', async () => {
    const result = await authorized({
      auth: {
        user: {
          id: 'user-1',
          role: 'manager',
          permissions: [],
          isElevated: false,
          roleAssigned: true,
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      request: {
        nextUrl: new URL('http://localhost/admin/kangur/appearance'),
      },
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('location')).toBe(
      'http://localhost/admin?denied=1'
    );
  });

  it('allows Kangur admin routes when settings.manage is present', async () => {
    const result = await authorized({
      auth: {
        user: {
          id: 'user-2',
          role: 'manager',
          permissions: ['settings.manage'],
          isElevated: false,
          roleAssigned: true,
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      request: {
        nextUrl: new URL('http://localhost/admin/kangur/appearance'),
      },
    });

    expect(result).toBe(true);
  });
});
