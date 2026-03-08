import { describe, expect, it } from 'vitest';

import { resolveKangurMobileDeveloperConfigFromSources } from './mobileDeveloperConfig.shared';

describe('resolveKangurMobileDeveloperConfigFromSources', () => {
  it('returns disabled defaults when developer config is unset', () => {
    expect(resolveKangurMobileDeveloperConfigFromSources({})).toEqual({
      autoSignIn: false,
      learnerLoginName: null,
      learnerPassword: null,
    });
  });

  it('normalizes configured developer auto sign-in credentials', () => {
    expect(
      resolveKangurMobileDeveloperConfigFromSources({
        extraDevAutoSignIn: true,
        extraDevLearnerLogin: ' e2e.admin ',
        extraDevLearnerPassword: ' TempLearner2026x ',
      }),
    ).toEqual({
      autoSignIn: true,
      learnerLoginName: 'e2e.admin',
      learnerPassword: 'TempLearner2026x',
    });
  });
});
