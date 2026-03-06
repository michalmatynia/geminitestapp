import {
  DEFAULT_PORTABLE_PAYLOAD_LIMITS,
  type PortablePayloadLimits,
} from './portable-engine-resolution-types';

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const resolvePayloadLimits = (
  limits?: Partial<PortablePayloadLimits>
): PortablePayloadLimits => ({
  ...DEFAULT_PORTABLE_PAYLOAD_LIMITS,
  ...(limits ?? {}),
});

const getUtf8ByteSize = (value: string): number => {
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(value).length;
  }
  // Fallback approximation in environments without TextEncoder.
  return value.length * 2;
};

export const decodePortablePayload = (
  input: unknown
): { ok: true; value: unknown; payloadByteSize: number | null } | { ok: false; error: string } => {
  if (typeof input !== 'string') {
    return { ok: true, value: input, payloadByteSize: null };
  }
  try {
    return {
      ok: true,
      value: JSON.parse(input) as unknown,
      payloadByteSize: getUtf8ByteSize(input),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Invalid JSON payload: ${message}` };
  }
};

export const estimatePayloadByteSize = (
  value: unknown
): { ok: true; value: number } | { ok: false; error: string } => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') {
      return {
        ok: false,
        error: 'Payload cannot be serialized to JSON for size validation.',
      };
    }
    return { ok: true, value: getUtf8ByteSize(serialized) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Payload cannot be serialized to JSON for size validation: ${message}`,
    };
  }
};

export const validatePayloadObjectSafety = (
  value: unknown,
  limits: PortablePayloadLimits,
  depth = 0,
  path = 'payload',
  ancestors: WeakSet<object> = new WeakSet()
): string | null => {
  if (depth > limits.maxDepth) {
    return `Payload exceeds maximum depth (${limits.maxDepth}) at ${path}.`;
  }
  if (typeof value === 'string' && value.length > limits.maxStringLength) {
    return `Payload string is too long at ${path} (max ${limits.maxStringLength} chars).`;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const objectValue = value;
  if (ancestors.has(objectValue)) {
    return `Payload contains circular reference at ${path}.`;
  }
  ancestors.add(objectValue);
  if (Array.isArray(value)) {
    try {
      if (value.length > limits.maxArrayLength) {
        return `Payload array is too large at ${path} (max ${limits.maxArrayLength} items).`;
      }
      for (let index = 0; index < value.length; index += 1) {
        const issue = validatePayloadObjectSafety(
          value[index],
          limits,
          depth + 1,
          `${path}[${index}]`,
          ancestors
        );
        if (issue) return issue;
      }
      return null;
    } finally {
      ancestors.delete(objectValue);
    }
  }
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > limits.maxObjectKeys) {
      return `Payload object has too many keys at ${path} (max ${limits.maxObjectKeys}).`;
    }
    for (const key of keys) {
      if (UNSAFE_OBJECT_KEYS.has(key)) {
        return `Payload contains unsafe key "${key}" at ${path}.`;
      }
      const issue = validatePayloadObjectSafety(record[key], limits, depth + 1, `${path}.${key}`, ancestors);
      if (issue) return issue;
    }
    return null;
  } finally {
    ancestors.delete(objectValue);
  }
};
