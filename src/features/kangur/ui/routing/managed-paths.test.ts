import { describe, expect, it } from 'vitest';

import {
  canonicalizeKangurPublicAliasHref,
  canonicalizeKangurPublicAliasPathname,
} from '@/features/kangur/ui/routing/managed-paths';

describe('managed-paths canonical Kangur alias helpers', () => {
  it('canonicalizes the root-owned Kangur lessons alias pathname', () => {
    expect(canonicalizeKangurPublicAliasPathname('/kangur/lessons')).toBe('/lessons');
  });

  it('canonicalizes localized Kangur alias pathnames', () => {
    expect(canonicalizeKangurPublicAliasPathname('/en/kangur/duels')).toBe('/en/duels');
    expect(canonicalizeKangurPublicAliasPathname('/de/kangur')).toBe('/de');
  });

  it('drops the default locale prefix when canonicalizing alias pathnames', () => {
    expect(canonicalizeKangurPublicAliasPathname('/pl/kangur/lessons')).toBe('/lessons');
  });

  it('preserves search params and hashes while canonicalizing hrefs', () => {
    expect(canonicalizeKangurPublicAliasHref('/uk/kangur/lessons?focus=clock#mission')).toBe(
      '/uk/lessons?focus=clock#mission'
    );
  });

  it('leaves non-alias managed hrefs unchanged', () => {
    expect(canonicalizeKangurPublicAliasHref('/en/lessons?focus=clock')).toBe(
      '/en/lessons?focus=clock'
    );
    expect(canonicalizeKangurPublicAliasPathname('/games')).toBe('/games');
  });
});
