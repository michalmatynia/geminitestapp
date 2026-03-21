import { describe, expect, it } from 'vitest';

import { analyzeKangurMobileIosToolchain } from './check-kangur-mobile-ios-toolchain';

describe('analyzeKangurMobileIosToolchain', () => {
  it('passes when full Xcode and simctl are available', () => {
    expect(
      analyzeKangurMobileIosToolchain({
        developerDir: '/Applications/Xcode.app/Contents/Developer',
        simctlHasAvailableDevices: true,
        simctlAvailable: true,
        simctlLicenseBlocked: false,
        xcodebuildAvailable: true,
      }),
    ).toEqual({
      issues: [],
      resolved: {
        developerDir: '/Applications/Xcode.app/Contents/Developer',
      },
      status: 'ok',
    });
  });

  it('fails when only Command Line Tools are active', () => {
    const report = analyzeKangurMobileIosToolchain({
      developerDir: '/Library/Developer/CommandLineTools',
      simctlHasAvailableDevices: false,
      simctlAvailable: false,
      simctlLicenseBlocked: false,
      xcodebuildAvailable: false,
    });

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Full Xcode is required'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('xcodebuild is unavailable'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('simctl is unavailable'),
        }),
      ]),
    );
  });

  it('fails when no active developer directory is configured', () => {
    const report = analyzeKangurMobileIosToolchain({
      developerDir: null,
      simctlHasAvailableDevices: true,
      simctlAvailable: true,
      simctlLicenseBlocked: false,
      xcodebuildAvailable: true,
    });

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('xcode-select does not report'),
        }),
      ]),
    );
  });

  it('fails with a specific message when the Xcode license is not accepted', () => {
    const report = analyzeKangurMobileIosToolchain({
      developerDir: '/Applications/Xcode.app/Contents/Developer',
      simctlHasAvailableDevices: false,
      simctlAvailable: false,
      simctlLicenseBlocked: true,
      xcodebuildAvailable: true,
    });

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Xcode license has not been accepted'),
        }),
      ]),
    );
  });

  it('warns with a specific message when simctl hits a transient CoreSimulatorService failure', () => {
    const report = analyzeKangurMobileIosToolchain({
      developerDir: '/Applications/Xcode.app/Contents/Developer',
      simctlHasAvailableDevices: false,
      simctlAvailable: false,
      simctlLicenseBlocked: false,
      simctlTransientFailure: true,
      xcodebuildAvailable: true,
    });

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('transient CoreSimulatorService failure'),
        }),
      ]),
    );
  });

  it('fails with a specific message when no simulator devices are available', () => {
    const report = analyzeKangurMobileIosToolchain({
      developerDir: '/Applications/Xcode.app/Contents/Developer',
      simctlHasAvailableDevices: false,
      simctlAvailable: true,
      simctlLicenseBlocked: false,
      xcodebuildAvailable: true,
    });

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('no iOS devices are currently available in Simulator.app'),
        }),
      ]),
    );
  });
});
