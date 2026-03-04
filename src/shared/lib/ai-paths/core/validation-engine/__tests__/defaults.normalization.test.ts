import { describe, expect, it } from 'vitest';

import {
  AI_PATHS_VALIDATION_SCHEMA_VERSION,
  normalizeAiPathsValidationConfig,
} from '../defaults';

describe('normalizeAiPathsValidationConfig', () => {
  it('keeps lastEvaluatedAt for legacy schema payloads', () => {
    const normalized = normalizeAiPathsValidationConfig({
      schemaVersion: 1,
      lastEvaluatedAt: '2026-03-04T20:00:00.000Z',
    });

    expect(normalized.schemaVersion).toBe(AI_PATHS_VALIDATION_SCHEMA_VERSION);
    expect(normalized.lastEvaluatedAt).toBe('2026-03-04T20:00:00.000Z');
  });

  it('keeps null lastEvaluatedAt when payload has no timestamp', () => {
    const normalized = normalizeAiPathsValidationConfig({
      schemaVersion: 1,
    });

    expect(normalized.schemaVersion).toBe(AI_PATHS_VALIDATION_SCHEMA_VERSION);
    expect(normalized.lastEvaluatedAt).toBeNull();
  });
});
