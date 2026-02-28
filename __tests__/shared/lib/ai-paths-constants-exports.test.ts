import { describe, expect, it } from 'vitest';

import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_LOCAL_RUNS_KEY,
  PATH_CONFIG_PREFIX,
  PORT_COMPATIBILITY,
  STORAGE_VERSION,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';

describe('ai paths constants barrel', () => {
  it('exports storage and trigger constants after the segmented refactor', () => {
    expect(AI_PATHS_HISTORY_RETENTION_DEFAULT).toBe(3);
    expect(AI_PATHS_LOCAL_RUNS_KEY).toBe('ai_paths_local_runs');
    expect(PATH_CONFIG_PREFIX).toBe('ai_paths_config_');
    expect(STORAGE_VERSION).toBe(1);
    expect(TRIGGER_EVENTS).toEqual([
      { id: 'manual', label: 'Manual / UI Trigger' },
      { id: 'scheduled_run', label: 'Scheduled Run (Server)' },
    ]);
    expect(PORT_COMPATIBILITY['trigger']).toContain('value');
  });
});
