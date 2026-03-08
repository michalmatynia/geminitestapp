import { describe, expect, it, vi } from 'vitest';

import {
  createKangurMobileRuntimeBackendNextSteps,
  createKangurMobileRuntimeBackendProbeUrl,
  parseKangurMobileRuntimeBackendTarget,
  probeKangurMobileRuntimeBackend,
  resolveKangurMobileRuntimeBackendApiUrl,
  shouldUseKangurMobileRuntimeBackendLocalLaunchEnv,
  shouldSkipKangurMobileRuntimeBackendProbe,
} from './check-kangur-mobile-runtime-backend';

describe('createKangurMobileRuntimeBackendProbeUrl', () => {
  it('normalizes trailing slashes before appending the probe path', () => {
    expect(
      createKangurMobileRuntimeBackendProbeUrl('http://localhost:3000/'),
    ).toBe('http://localhost:3000/api/kangur/auth/me');
  });
});

describe('createKangurMobileRuntimeBackendNextSteps', () => {
  it('includes the full command chain for a successful iOS backend check', () => {
    expect(
      createKangurMobileRuntimeBackendNextSteps('ios-simulator', 'ok'),
    ).toEqual([
      'Run npm run prepare:mobile:runtime:ios once the backend check is green for this target.',
      'Run npm run dev:mobile:ios:local to launch Expo for this target.',
      'After Expo launches, run npm run checklist:mobile:native:runtime:ios for the learner-session validation flow.',
    ]);
  });

  it('includes the backend re-run step when the probe is skipped', () => {
    expect(
      createKangurMobileRuntimeBackendNextSteps('device', 'skipped'),
    ).toEqual([
      'Re-run npm run check:mobile:runtime:backend:device outside the Codex sandbox or in your normal shell before native validation.',
      'Run npm run prepare:mobile:runtime:device once the backend check is green for this target.',
      'Run npm run dev:mobile:device:local to launch Expo for this target.',
      'After Expo launches, run npm run checklist:mobile:native:runtime:device for the learner-session validation flow.',
    ]);
  });
});

describe('parseKangurMobileRuntimeBackendTarget', () => {
  it('defaults to ios-simulator when no target is provided', () => {
    expect(parseKangurMobileRuntimeBackendTarget([])).toBe('ios-simulator');
  });

  it('parses supported targets', () => {
    expect(
      parseKangurMobileRuntimeBackendTarget(['--target', 'android-emulator']),
    ).toBe('android-emulator');
    expect(
      parseKangurMobileRuntimeBackendTarget(['--target=device']),
    ).toBe('device');
  });
});

describe('shouldUseKangurMobileRuntimeBackendLocalLaunchEnv', () => {
  it('detects the local launch env flag', () => {
    expect(
      shouldUseKangurMobileRuntimeBackendLocalLaunchEnv(['--local-launch-env']),
    ).toBe(true);
    expect(shouldUseKangurMobileRuntimeBackendLocalLaunchEnv([])).toBe(false);
  });
});

describe('resolveKangurMobileRuntimeBackendApiUrl', () => {
  it('keeps localhost for android host-side backend probes', () => {
    expect(
      resolveKangurMobileRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'android-emulator',
        {
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://localhost:3000');
  });

  it('converts 10.0.2.2 back to localhost for android host-side probes', () => {
    expect(
      resolveKangurMobileRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://10.0.2.2:3000',
        },
        'android-emulator',
        {
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://localhost:3000');
  });

  it('uses the LAN host for device probes when local-launch mode is on', () => {
    expect(
      resolveKangurMobileRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'device',
        {
          deviceLanHost: '192.168.1.20',
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://192.168.1.20:3000');
  });
});

describe('probeKangurMobileRuntimeBackend', () => {
  it('returns ok when the backend responds below 500', async () => {
    const probeImpl = vi.fn(async () => ({
      statusCode: 401,
    }));

    await expect(
      probeKangurMobileRuntimeBackend('http://localhost:3000', probeImpl),
    ).resolves.toEqual({
      apiUrl: 'http://localhost:3000',
      probeUrl: 'http://localhost:3000/api/kangur/auth/me',
      responseStatus: 401,
      status: 'ok',
    });
  });

  it('fails clearly when the backend is unreachable', async () => {
    const probeImpl = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    });

    await expect(
      probeKangurMobileRuntimeBackend('http://localhost:3000', probeImpl),
    ).rejects.toThrow(/Could not reach the Kangur backend/);
  });

  it('fails clearly when the backend returns a server error', async () => {
    const probeImpl = vi.fn(async () => ({
      statusCode: 503,
    }));

    await expect(
      probeKangurMobileRuntimeBackend('http://localhost:3000', probeImpl),
    ).rejects.toThrow(/responded with 503/);
  });
});

describe('shouldSkipKangurMobileRuntimeBackendProbe', () => {
  it('skips the live probe inside the Codex sandbox', () => {
    expect(
      shouldSkipKangurMobileRuntimeBackendProbe({
        CODEX_SANDBOX_NETWORK_DISABLED: '1',
      }),
    ).toBe(true);
  });

  it('does not skip the live probe outside the Codex sandbox', () => {
    expect(
      shouldSkipKangurMobileRuntimeBackendProbe({
        CODEX_SANDBOX_NETWORK_DISABLED: '0',
      }),
    ).toBe(false);
    expect(shouldSkipKangurMobileRuntimeBackendProbe({})).toBe(false);
  });
});
