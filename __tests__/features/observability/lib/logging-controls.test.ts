import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
  getObservabilityLoggingControlTypeForSystemLogLevel,
  getObservabilityLoggingSettingKey,
  parseObservabilityLoggingEnabledSetting,
  resolveObservabilityLoggingControls,
} from '@/shared/lib/observability/logging-controls';
import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';

describe('logging-controls', () => {
  it('uses enabled defaults when settings are missing', () => {
    expect(resolveObservabilityLoggingControls(() => undefined)).toEqual(
      DEFAULT_OBSERVABILITY_LOGGING_CONTROLS
    );
  });

  it('parses boolean-like persisted values', () => {
    expect(parseObservabilityLoggingEnabledSetting('true', false)).toBe(true);
    expect(parseObservabilityLoggingEnabledSetting('false', true)).toBe(false);
    expect(parseObservabilityLoggingEnabledSetting('1', false)).toBe(true);
    expect(parseObservabilityLoggingEnabledSetting('0', true)).toBe(false);
    expect(parseObservabilityLoggingEnabledSetting('yes', false)).toBe(true);
    expect(parseObservabilityLoggingEnabledSetting('off', true)).toBe(false);
    expect(parseObservabilityLoggingEnabledSetting('invalid', false)).toBe(false);
  });

  it('resolves controls from the expected setting keys', () => {
    const values = new Map<string, string>([
      [OBSERVABILITY_LOGGING_KEYS.infoEnabled, 'false'],
      [OBSERVABILITY_LOGGING_KEYS.activityEnabled, 'true'],
      [OBSERVABILITY_LOGGING_KEYS.errorEnabled, 'false'],
    ]);

    expect(
      resolveObservabilityLoggingControls((key: string) => values.get(key))
    ).toEqual({
      infoEnabled: false,
      activityEnabled: true,
      errorEnabled: false,
    });
  });

  it('maps system log levels to the right control buckets', () => {
    expect(getObservabilityLoggingControlTypeForSystemLogLevel('info')).toBe('info');
    expect(getObservabilityLoggingControlTypeForSystemLogLevel('warn')).toBe('error');
    expect(getObservabilityLoggingControlTypeForSystemLogLevel('error')).toBe('error');
    expect(getObservabilityLoggingControlTypeForSystemLogLevel('info', true)).toBe('error');
  });

  it('returns stable setting keys for each control type', () => {
    expect(getObservabilityLoggingSettingKey('info')).toBe(
      OBSERVABILITY_LOGGING_KEYS.infoEnabled
    );
    expect(getObservabilityLoggingSettingKey('activity')).toBe(
      OBSERVABILITY_LOGGING_KEYS.activityEnabled
    );
    expect(getObservabilityLoggingSettingKey('error')).toBe(
      OBSERVABILITY_LOGGING_KEYS.errorEnabled
    );
  });
});
