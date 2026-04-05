import { describe, expect, it } from 'vitest';

import * as authIndex from './index';

describe('auth index barrel', () => {
  it('continues exposing the auth admin page entrypoints', () => {
    expect(authIndex).toHaveProperty('AuthHomePage');
    expect(authIndex).toHaveProperty('AuthDashboardPage');
    expect(authIndex).toHaveProperty('AuthLoginActivityPage');
    expect(authIndex).toHaveProperty('AuthPermissionsPage');
    expect(authIndex).toHaveProperty('AuthSettingsPage');
    expect(authIndex).toHaveProperty('AuthUserPagesPage');
    expect(authIndex).toHaveProperty('AuthUsersPage');
    expect(authIndex).toHaveProperty('RegisterPage');
    expect(authIndex).toHaveProperty('SignInPage');
  });
});
