import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const runtimeFiles = [
  path.join(projectRoot, 'src/features/ai/insights/generator.ts'),
  path.join(projectRoot, 'src/features/ai/insights/generator/settings-service.ts'),
];

const forbiddenTokens = [
  'LEGACY_INSIGHT_SCHEDULE_KEYS',
  'readSettingWithFallback(',
  'ai_analytics_schedule_enabled',
  'ai_analytics_schedule_minutes',
  'ai_runtime_analytics_schedule_enabled',
  'ai_runtime_analytics_schedule_minutes',
  'ai_logs_schedule_enabled',
  'ai_logs_schedule_minutes',
  'ai_logs_auto_on_error',
];

describe('ai insights runtime legacy-compat prune guard', () => {
  it('keeps legacy schedule-key fallback tokens out of runtime source', () => {
    const offenders = runtimeFiles
      .filter((absolute): boolean => {
        const content = readFileSync(absolute, 'utf8');
        return forbiddenTokens.some((token: string): boolean => content.includes(token));
      })
      .map((absolute): string => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
