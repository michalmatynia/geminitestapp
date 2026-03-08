import { describe, expect, it } from 'vitest';

import {
  FRONT_PAGE_ALLOWED,
  FRONT_PAGE_APP_ROUTE,
  getFrontPageRedirectPath,
  normalizeFrontPageApp,
} from '@/shared/lib/front-page-app';

describe('front-page-app helpers', () => {
  it('accepts all supported stored values', () => {
    expect(FRONT_PAGE_ALLOWED.has('cms')).toBe(true);
    expect(FRONT_PAGE_ALLOWED.has('products')).toBe(true);
    expect(FRONT_PAGE_ALLOWED.has('kangur')).toBe(true);
    expect(FRONT_PAGE_ALLOWED.has('chatbot')).toBe(true);
    expect(FRONT_PAGE_ALLOWED.has('notes')).toBe(true);
  });

  it('normalizes the legacy products value to cms', () => {
    expect(normalizeFrontPageApp('products')).toBe('cms');
  });

  it('keeps supported direct values unchanged', () => {
    expect(normalizeFrontPageApp('cms')).toBe('cms');
    expect(normalizeFrontPageApp('kangur')).toBe('kangur');
    expect(normalizeFrontPageApp('chatbot')).toBe('chatbot');
    expect(normalizeFrontPageApp('notes')).toBe('notes');
  });

  it('returns null for unsupported values', () => {
    expect(normalizeFrontPageApp('unknown')).toBeNull();
    expect(normalizeFrontPageApp(null)).toBeNull();
    expect(normalizeFrontPageApp(undefined)).toBeNull();
  });

  it('exposes the canonical route for each selectable app', () => {
    expect(FRONT_PAGE_APP_ROUTE.cms).toBe('/');
    expect(FRONT_PAGE_APP_ROUTE.kangur).toBe('/kangur');
    expect(FRONT_PAGE_APP_ROUTE.chatbot).toBe('/admin/chatbot');
    expect(FRONT_PAGE_APP_ROUTE.notes).toBe('/admin/notes');
  });

  it('resolves redirect paths only for non-cms destinations', () => {
    expect(getFrontPageRedirectPath('cms')).toBeNull();
    expect(getFrontPageRedirectPath('products')).toBeNull();
    expect(getFrontPageRedirectPath('kangur')).toBe('/kangur');
    expect(getFrontPageRedirectPath('chatbot')).toBe('/admin/chatbot');
    expect(getFrontPageRedirectPath('notes')).toBe('/admin/notes');
    expect(getFrontPageRedirectPath('unknown')).toBeNull();
  });
});
