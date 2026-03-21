import { describe, expect, it } from 'vitest';

import { createKangurMobileNativeDependencyReport } from './check-kangur-mobile-native-deps';

describe('createKangurMobileNativeDependencyReport', () => {
  it('passes when every section resolves its dependencies', () => {
    expect(
      createKangurMobileNativeDependencyReport([
        {
          label: 'Expo dev-middleware logger chain',
          missingDependencies: [],
          packageJsonPath: '/tmp/lighthouse-logger/package.json',
        },
        {
          label: 'React Native Babel preset',
          missingDependencies: [],
          packageJsonPath: '/tmp/@react-native/babel-preset/package.json',
        },
      ]),
    ).toEqual({
      issues: [],
      sections: [
        {
          label: 'Expo dev-middleware logger chain',
          missingDependencies: [],
          packageJsonPath: '/tmp/lighthouse-logger/package.json',
        },
        {
          label: 'React Native Babel preset',
          missingDependencies: [],
          packageJsonPath: '/tmp/@react-native/babel-preset/package.json',
        },
      ],
      status: 'ok',
    });
  });

  it('reports missing native dependencies with an install hint', () => {
    const report = createKangurMobileNativeDependencyReport([
      {
        label: 'Expo dev-middleware logger chain',
        missingDependencies: ['marky'],
        packageJsonPath: '/tmp/lighthouse-logger/package.json',
      },
      {
        label: 'React Native runtime bootstrap',
        missingDependencies: ['react-devtools-core', 'regenerator-runtime'],
        packageJsonPath: '/tmp/react-native/package.json',
      },
    ]);

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('marky'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('react-devtools-core, regenerator-runtime'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('npm install --workspace @kangur/mobile'),
        }),
      ]),
    );
  });
});
