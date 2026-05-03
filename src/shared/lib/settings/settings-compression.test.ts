/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatchClientCatch: vi.fn(),
  logWarning: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-dispatch', () => ({
  dispatchClientCatch: mocks.dispatchClientCatch,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logWarning: mocks.logWarning,
  },
}));

import {
  COMPRESSED_SETTING_PREFIX,
  decodeSettingValue,
  encodeSettingValue,
  shouldCompressSettingValue,
} from './settings-compression';

describe('settings compression', () => {
  beforeEach(() => {
    mocks.dispatchClientCatch.mockReset();
    mocks.logWarning.mockReset().mockResolvedValue(undefined);
  });

  it('knows which setting keys are compressible', () => {
    expect(shouldCompressSettingValue('case_resolver_workspace_v2')).toBe(true);
    expect(shouldCompressSettingValue('case_resolver_workspace_v2_history')).toBe(true);
    expect(shouldCompressSettingValue('case_resolver_workspace_v2_documents')).toBe(true);
    expect(shouldCompressSettingValue('other_setting')).toBe(false);
  });

  it('encodes repetitive compressible values, decodes them back, and avoids double-compression', () => {
    const key = 'case_resolver_workspace_v2';
    const value = JSON.stringify({
      items: Array.from({ length: 200 }, () => 'repeat-me-repeat-me-repeat-me'),
    });

    const encoded = encodeSettingValue(key, value);

    expect(encoded.startsWith(COMPRESSED_SETTING_PREFIX)).toBe(true);
    expect(decodeSettingValue(key, encoded)).toBe(value);
    expect(encodeSettingValue(key, encoded)).toBe(encoded);
  });

  it('returns original values for non-compressible or non-beneficial payloads', () => {
    expect(encodeSettingValue('other_setting', 'plain-value')).toBe('plain-value');
    expect(encodeSettingValue('case_resolver_workspace_v2', 'tiny')).toBe('tiny');
    expect(decodeSettingValue('case_resolver_workspace_v2', 'plain-value')).toBe('plain-value');
  });

  it('falls back on invalid compressed payloads and logs warnings', async () => {
    const invalid = `${COMPRESSED_SETTING_PREFIX}not-valid-gzip`;

    expect(decodeSettingValue('case_resolver_workspace_v2', invalid)).toBe(invalid);
    expect(mocks.dispatchClientCatch).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchClientCatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'settings-compression',
        action: 'decodeSettingValue',
        key: 'case_resolver_workspace_v2',
      })
    );
    expect(mocks.logWarning).toHaveBeenCalledWith(
      '[settings] Failed to decompress setting value.',
      expect.objectContaining({
        service: 'settings-compression',
        key: 'case_resolver_workspace_v2',
        error: expect.anything(),
      })
    );
  });
});
