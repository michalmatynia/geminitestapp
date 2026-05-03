import { gunzipSync, gzipSync } from 'zlib';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { dispatchClientCatch } from '@/shared/utils/observability/client-error-dispatch';

export const COMPRESSED_SETTING_PREFIX = '__gz_b64__:';

const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
const CASE_RESOLVER_WORKSPACE_HISTORY_KEY = 'case_resolver_workspace_v2_history';
const CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY = 'case_resolver_workspace_v2_documents';
const COMPRESSIBLE_SETTING_KEYS = new Set<string>([
  CASE_RESOLVER_WORKSPACE_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
]);

export const shouldCompressSettingValue = (key: string): boolean =>
  COMPRESSIBLE_SETTING_KEYS.has(key);

const isCompressedSettingValue = (value: string): boolean =>
  value.startsWith(COMPRESSED_SETTING_PREFIX);

const decodeCompressedSettingPayload = (value: string): string | null => {
  const encoded = value.slice(COMPRESSED_SETTING_PREFIX.length);
  const decompressedUnknown: unknown = gunzipSync(Buffer.from(encoded, 'base64'));
  if (!Buffer.isBuffer(decompressedUnknown)) return null;
  return decompressedUnknown.toString('utf8');
};

export const decodeSettingValue = (key: string, value: string): string => {
  if (!isCompressedSettingValue(value)) return value;
  try {
    return decodeCompressedSettingPayload(value) ?? value;
  } catch (error) {
    dispatchClientCatch(error, {
      source: 'settings-compression',
      action: 'decodeSettingValue',
      key,
    });
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
  if (isCompressedSettingValue(value) && decodeSettingValue(key, value) !== value) {
    return value;
  }
  try {
    const compressedUnknown: unknown = gzipSync(Buffer.from(value, 'utf8'));
    if (!Buffer.isBuffer(compressedUnknown)) return value;
    const encoded = `${COMPRESSED_SETTING_PREFIX}${compressedUnknown.toString('base64')}`;
    return encoded.length < value.length ? encoded : value;
  } catch (error) {
    dispatchClientCatch(error, {
      source: 'settings-compression',
      action: 'encodeSettingValue',
      key,
      valueLength: value.length,
    });
    void ErrorSystem.logWarning('[settings] Failed to compress setting value.', {
      service: 'settings-compression',
      key,
      error,
    });
    return value;
  }
};
