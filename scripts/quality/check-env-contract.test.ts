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

  it('warns when both database providers are configured without APP_DB_PROVIDER', () => {
    const report = analyzeEnvContract({
      env: {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://localhost:5432/app',
        MONGODB_URI: 'mongodb://localhost:27017/app',
      },
    });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'dual-database-provider-implicit-fallback',
        }),
      ])
    );
  });

  it('fails when production auth secret is missing', () => {
    const report = analyzeEnvContract({
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://localhost:5432/app',
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
