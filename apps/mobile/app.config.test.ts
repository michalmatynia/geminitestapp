import { describe, expect, it } from 'vitest';

import {
  analyzeKangurMobileBuildEnv,
  createKangurExpoConfig,
} from './mobileExpoConfig';

describe('createKangurExpoConfig', () => {
  it('returns stable defaults when mobile env overrides are unset', () => {
    const config = createKangurExpoConfig({});

    expect(config.name).toBe('Kangur Mobile');
    expect(config.slug).toBe('kangur-mobile');
    expect(config.scheme).toBe('kangur');
    expect(config.version).toBe('0.1.0');
    expect(config.backgroundColor).toBe('#fffaf2');
    expect(config.splash).toEqual({
      backgroundColor: '#fffaf2',
      resizeMode: 'contain',
    });
    expect(config.ios?.bundleIdentifier).toBe('com.kangur.mobile');
    expect(config.android?.package).toBe('com.kangur.mobile');
    expect(config.extra).toEqual({
      kangurAuthMode: 'development',
    });
  });

  it('applies env overrides for native identifiers and eas project wiring', () => {
    const config = createKangurExpoConfig({
      EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      EXPO_PUBLIC_KANGUR_AUTH_MODE: 'learner-session',
      KANGUR_DEV_AUTO_SIGN_IN: 'true',
      KANGUR_DEV_LEARNER_LOGIN: 'e2e.admin',
      KANGUR_DEV_LEARNER_PASSWORD: 'TempLearner2026x',
      KANGUR_ANDROID_PACKAGE: 'com.example.kangur.mobile',
      KANGUR_EXPO_NAME: 'Kangur Preview',
      KANGUR_EXPO_OWNER: 'kangur-team',
      KANGUR_EXPO_PROJECT_ID: '123e4567-e89b-42d3-a456-426614174000',
      KANGUR_EXPO_SCHEME: 'kangur-preview',
      KANGUR_EXPO_SLUG: 'kangur-mobile-preview',
      KANGUR_EXPO_VERSION: '0.2.0',
      KANGUR_IOS_BUNDLE_IDENTIFIER: 'com.example.kangur.mobile',
    });

    expect(config.name).toBe('Kangur Preview');
    expect(config.slug).toBe('kangur-mobile-preview');
    expect(config.scheme).toBe('kangur-preview');
    expect(config.version).toBe('0.2.0');
    expect(config.owner).toBe('kangur-team');
    expect(config.ios?.bundleIdentifier).toBe('com.example.kangur.mobile');
    expect(config.android?.package).toBe('com.example.kangur.mobile');
    expect(config.extra).toEqual({
      eas: {
        projectId: '123e4567-e89b-42d3-a456-426614174000',
      },
      kangurAuthMode: 'learner-session',
      kangurApiUrl: 'http://localhost:3000',
      kangurDevAutoSignIn: true,
      kangurDevLearnerLogin: 'e2e.admin',
      kangurDevLearnerPassword: 'TempLearner2026x',
    });
  });

  it('throws on invalid native identifiers and project ids', () => {
    expect(() =>
      createKangurExpoConfig({
        KANGUR_IOS_BUNDLE_IDENTIFIER: 'kangur mobile',
      }),
    ).toThrow(/KANGUR_IOS_BUNDLE_IDENTIFIER/);

    expect(() =>
      createKangurExpoConfig({
        KANGUR_ANDROID_PACKAGE: 'Com.Example.Kangur',
      }),
    ).toThrow(/KANGUR_ANDROID_PACKAGE/);

    expect(() =>
      createKangurExpoConfig({
        KANGUR_EXPO_PROJECT_ID: 'not-a-project-id',
      }),
    ).toThrow(/KANGUR_EXPO_PROJECT_ID/);
  });

  it('reports preview build errors for placeholder identifiers and missing eas wiring', () => {
    const report = analyzeKangurMobileBuildEnv({}, 'preview');

    expect(report.status).toBe('error');
    expect(report.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('KANGUR_IOS_BUNDLE_IDENTIFIER still uses the placeholder default'),
        expect.stringContaining('KANGUR_ANDROID_PACKAGE still uses the placeholder default'),
        expect.stringContaining('KANGUR_EXPO_OWNER is required'),
        expect.stringContaining('KANGUR_EXPO_PROJECT_ID is required'),
      ]),
    );
  });

  it('accepts preview build env when real identifiers and eas wiring are present', () => {
    const report = analyzeKangurMobileBuildEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        KANGUR_ANDROID_PACKAGE: 'com.example.kangur.mobile',
        KANGUR_EXPO_OWNER: 'kangur-team',
        KANGUR_EXPO_PROJECT_ID: '123e4567-e89b-42d3-a456-426614174000',
        KANGUR_IOS_BUNDLE_IDENTIFIER: 'com.example.kangur.mobile',
      },
      'preview',
    );

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual([]);
  });
});
