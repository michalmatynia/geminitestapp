import { describe, expect, it } from 'vitest';

import { analyzeEnvContract } from './lib/check-env-contract.mjs';

describe('analyzeEnvContract', () => {
  it('fails when no primary database provider is configured', () => {
    const report = analyzeEnvContract({ env: { NODE_ENV: 'development' } });

    expect(report.summary.errorCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      ruleId: 'database-provider-missing',
    });
  });

  it('does not warn when MongoDB is configured without legacy SQL env vars', () => {
    const report = analyzeEnvContract({
      env: {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/app',
      },
    });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('fails when production auth secret is missing', () => {
    const report = analyzeEnvContract({
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/app',
      },
    });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'auth-secret-missing-production',
        }),
      ])
    );
  });
});
