import { describe, expect, it } from 'vitest';

import {
  createKangurMobileExportSmokeBaseUrl,
  parseKangurMobileExportSmokeLocalOptions,
  resolveKangurMobileExportSmokeRuntimeEnv,
} from './run-kangur-mobile-export-smoke-local';

describe('parseKangurMobileExportSmokeLocalOptions', () => {
  it('uses the default port and export flow when no flags are provided', () => {
    expect(parseKangurMobileExportSmokeLocalOptions([])).toEqual({
      port: 8081,
      skipExport: false,
    });
  });

  it('supports skip-export and custom port flags', () => {
    expect(
      parseKangurMobileExportSmokeLocalOptions([
        '--skip-export',
        '--port',
        '9090',
      ]),
    ).toEqual({
      port: 9090,
      skipExport: true,
    });
  });

  it('rejects unknown arguments', () => {
    expect(() =>
      parseKangurMobileExportSmokeLocalOptions(['--unknown']),
    ).toThrow(/Unknown argument/);
  });
});

describe('createKangurMobileExportSmokeBaseUrl', () => {
  it('builds the localhost smoke base url from the port', () => {
    expect(createKangurMobileExportSmokeBaseUrl(8082)).toBe(
      'http://localhost:8082',
    );
  });
});

describe('resolveKangurMobileExportSmokeRuntimeEnv', () => {
  it('forces learner-session mode and uses local defaults when env is unset', () => {
    expect(
      resolveKangurMobileExportSmokeRuntimeEnv({
        baseUrl: 'http://localhost:8081',
        env: {},
      }),
    ).toEqual({
      apiUrl: 'http://localhost:3000',
      authMode: 'learner-session',
      smokeBaseUrl: 'http://localhost:8081',
    });
  });

  it('preserves explicit api and smoke base env values', () => {
    expect(
      resolveKangurMobileExportSmokeRuntimeEnv({
        baseUrl: 'http://localhost:8081',
        env: {
          EXPO_PUBLIC_KANGUR_API_URL: 'https://kangur.example.com',
          KANGUR_MOBILE_SMOKE_BASE_URL: 'https://preview.example.com',
        },
      }),
    ).toEqual({
      apiUrl: 'https://kangur.example.com',
      authMode: 'learner-session',
      smokeBaseUrl: 'https://preview.example.com',
    });
  });
});
