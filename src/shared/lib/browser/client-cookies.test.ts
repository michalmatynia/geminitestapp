// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { readClientCookie, setClientCookie } from './client-cookies';

describe('client cookie helpers', () => {
  beforeEach(() => {
    document.cookie = 'feature=; Max-Age=0; Path=/';
    window.history.replaceState({}, '', '/kangur');
  });

  it('writes client cookies with the requested attributes and reads them back', () => {
    setClientCookie('feature', 'kangur value', {
      maxAgeSeconds: 61.9,
      path: '/kangur',
      sameSite: 'Strict',
    });

    expect(document.cookie).toContain('feature=kangur%20value');
    expect(readClientCookie('feature')).toBe('kangur value');
  });

  it('returns null when the cookie is missing', () => {
    expect(readClientCookie('missing')).toBeNull();
  });
});
