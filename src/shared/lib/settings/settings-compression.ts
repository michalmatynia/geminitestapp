import { gunzipSync, gzipSync } from 'zlib';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const COMPRESSED_SETTING_PREFIX = '__gz_b64__:';

const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
const CASE_RESOLVER_WORKSPACE_HISTORY_KEY = 'case_resolver_workspace_v2_history';
const COMPRESSIBLE_SETTING_KEYS = new Set<string>([
  CASE_RESOLVER_WORKSPACE_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
]);

export const shouldCompressSettingValue = (key: string): boolean =>
  COMPRESSIBLE_SETTING_KEYS.has(key);

export const decodeSettingValue = (key: string, value: string): string => {
  if (!value.startsWith(COMPRESSED_SETTING_PREFIX)) return value;
  try {
    const encoded = value.slice(COMPRESSED_SETTING_PREFIX.length);
    const decompressedUnknown: unknown = gunzipSync(Buffer.from(encoded, 'base64'));
    if (!Buffer.isBuffer(decompressedUnknown)) return value;
    return decompressedUnknown.toString('utf8');
  } catch (error) {
    void ErrorSystem.logWarning('[settings] Failed to decompress setting value.', {
      service: 'settings-compression',
      key,
      error,
    });
    return value;
  }
};

export const encodeSettingValue = (key: string, value: string): string => {
  if (!shouldCompressSettingValue(key)) return value;
  if (value.startsWith(COMPRESSED_SETTING_PREFIX) && decodeSettingValue(key, value) !== value) {
    return value;
  }
  try {
    const compressedUnknown: unknown = gzipSync(Buffer.from(value, 'utf8'));
    if (!Buffer.isBuffer(compressedUnknown)) return value;
    const encoded = `${COMPRESSED_SETTING_PREFIX}${compressedUnknown.toString('base64')}`;
    return encoded.length < value.length ? encoded : value;
  } catch (error) {
    void ErrorSystem.logWarning('[settings] Failed to compress setting value.', {
      service: 'settings-compression',
      key,
      error,
    });
    return value;
  }
};
