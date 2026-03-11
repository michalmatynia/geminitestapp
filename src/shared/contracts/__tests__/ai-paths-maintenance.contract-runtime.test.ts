import { describe, expect, it } from 'vitest';

import {
  aiPathsMaintenanceApplyResultSchema,
  aiPathsMaintenanceReportSchema,
} from '@/shared/contracts/ai-paths';

describe('ai-paths maintenance contract runtime', () => {
  it('parses maintenance reports', () => {
    const parsed = aiPathsMaintenanceReportSchema.parse({
      scannedAt: '2026-03-11T13:50:00.000Z',
      pendingActions: 1,
      blockingActions: 1,
      actions: [
        {
          id: 'repair_path_index',
          title: 'Repair path index',
          description: 'Rebuild the canonical path index.',
          blocking: true,
          status: 'pending',
          affectedRecords: 3,
        },
      ],
    });

    expect(parsed.actions[0]?.id).toBe('repair_path_index');
  });

  it('parses maintenance apply results', () => {
    const parsed = aiPathsMaintenanceApplyResultSchema.parse({
      appliedActionIds: ['normalize_runtime_kernel_settings'],
      report: {
        scannedAt: '2026-03-11T13:55:00.000Z',
        pendingActions: 0,
        blockingActions: 0,
        actions: [],
      },
    });

    expect(parsed.appliedActionIds).toEqual(['normalize_runtime_kernel_settings']);
    expect(parsed.report.pendingActions).toBe(0);
  });
});
