import { describe, expect, it } from 'vitest';

import * as authPublic from './public';

describe('auth public barrel', () => {
  it('exposes representative admin and public pages', () => {
    expect(authPublic).toHaveProperty('AuthHomePage');
    expect(authPublic).toHaveProperty('AuthUsersPage');
    expect(authPublic).toHaveProperty('RegisterPage');
    expect(authPublic).toHaveProperty('SignInPage');
  });

  it('continues exposing context, contracts, and auth utilities', () => {
    expect(authPublic).toHaveProperty('AuthProvider');
    expect(authPublic).toHaveProperty('useUserPreferences');
    expect(authPublic).toHaveProperty('DEFAULT_AUTH_SECURITY_POLICY');
    expect(authPublic).toHaveProperty('DEFAULT_AUTH_USER_PAGE_SETTINGS');
  });
});
