import { describe, expect, it } from 'vitest';

import { resolveKangurMobilePublicConfigFromSources } from './mobilePublicConfig.shared';

describe('resolveKangurMobilePublicConfigFromSources', () => {
  it('prefers explicit env values when they are present', () => {
    expect(
      resolveKangurMobilePublicConfigFromSources({
        envApiUrl: 'http://localhost:3000/',
        envAuthMode: 'learner-session',
        extraApiUrl: 'http://localhost:9999',
        extraAuthMode: 'development',
      }),
    ).toEqual({
      apiUrl: 'http://localhost:3000',
      authMode: 'learner-session',
    });
  });

  it('falls back to expo extra values when env values are unavailable', () => {
    expect(
      resolveKangurMobilePublicConfigFromSources({
        extraApiUrl: 'http://localhost:3000/',
        extraAuthMode: 'learner-session',
      }),
    ).toEqual({
      apiUrl: 'http://localhost:3000',
      authMode: 'learner-session',
    });
  });

  it('falls back to development defaults when no public config is set', () => {
    expect(resolveKangurMobilePublicConfigFromSources({})).toEqual({
      apiUrl: null,
      authMode: 'development',
    });
  });
});
