import { describe, expect, it } from 'vitest';

import {
  FRONT_PAGE_ALLOWED,
  FRONT_PAGE_APP_ROUTE,
  FRONT_PAGE_OPTIONS,
  getFrontPagePublicOwner,
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

  it('normalizes casing, whitespace, and the StudiQ brand alias', () => {
    expect(normalizeFrontPageApp(' Kangur ')).toBe('kangur');
    expect(normalizeFrontPageApp(' CMS ')).toBe('cms');
    expect(normalizeFrontPageApp('StudiQ')).toBe('kangur');
    expect(normalizeFrontPageApp('  studiq  ')).toBe('kangur');
  });

  it('returns null for unsupported values', () => {
    expect(normalizeFrontPageApp('unknown')).toBeNull();
    expect(normalizeFrontPageApp('   ')).toBeNull();
    expect(normalizeFrontPageApp(null)).toBeNull();
    expect(normalizeFrontPageApp(undefined)).toBeNull();
  });

  it('exposes the canonical route for each selectable app', () => {
    expect(FRONT_PAGE_APP_ROUTE.cms).toBe('/');
    expect(FRONT_PAGE_APP_ROUTE.kangur).toBe('/');
    expect(FRONT_PAGE_APP_ROUTE.chatbot).toBe('/admin/chatbot');
    expect(FRONT_PAGE_APP_ROUTE.notes).toBe('/admin/notes');
  });

  it('exposes the selectable options in UI order', () => {
    expect(FRONT_PAGE_OPTIONS.map((option) => option.id)).toEqual([
      'cms',
      'kangur',
      'chatbot',
      'notes',
    ]);
    expect(FRONT_PAGE_OPTIONS[0]?.title).toBe('CMS Home');
    expect(FRONT_PAGE_OPTIONS[1]?.route).toBe('/');
  });

  it('resolves redirect paths only for non-cms destinations', () => {
    expect(getFrontPageRedirectPath('cms')).toBeNull();
    expect(getFrontPageRedirectPath('products')).toBeNull();
    expect(getFrontPageRedirectPath('kangur')).toBeNull();
    expect(getFrontPageRedirectPath('chatbot')).toBe('/admin/chatbot');
    expect(getFrontPageRedirectPath('notes')).toBe('/admin/notes');
    expect(getFrontPageRedirectPath('unknown')).toBeNull();
  });

  it('resolves which app owns the public frontend', () => {
    expect(getFrontPagePublicOwner('cms')).toBe('cms');
    expect(getFrontPagePublicOwner('products')).toBe('cms');
    expect(getFrontPagePublicOwner('kangur')).toBe('kangur');
    expect(getFrontPagePublicOwner('chatbot')).toBe('cms');
    expect(getFrontPagePublicOwner('notes')).toBe('cms');
    expect(getFrontPagePublicOwner('unknown')).toBe('cms');
  });
});
