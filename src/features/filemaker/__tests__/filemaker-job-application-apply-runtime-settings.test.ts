import { describe, expect, it } from 'vitest';

import { JOB_APPLICATION_APPLY_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-application-apply-runtime-constants';

import {
  resolveJobApplicationApplyActionConnection,
  resolveJobApplicationApplyHeadless,
  updateJobApplicationApplyHeadlessAction,
} from '../components/page/filemaker-job-application-apply-runtime-settings';

describe('filemaker job application apply runtime settings', () => {
  it('resolves the seeded Apply runtime action as headless by default', () => {
    const action = resolveJobApplicationApplyActionConnection(undefined);

    expect(action?.runtimeKey).toBe(JOB_APPLICATION_APPLY_RUNTIME_KEY);
    expect(action?.id).toBe('runtime_action__job_application_apply');
    expect(action?.isSeedFallback).toBe(true);
    expect(resolveJobApplicationApplyHeadless(undefined)).toBe(true);
  });

  it('persists the modal browser-mode toggle onto the shared Apply runtime action', () => {
    const updatedActions = updateJobApplicationApplyHeadlessAction({
      actions: [],
      headless: false,
      updatedAt: '2026-04-30T00:00:00.000Z',
    });
    const applyAction = updatedActions.find(
      (action) => action.runtimeKey === JOB_APPLICATION_APPLY_RUNTIME_KEY
    );

    expect(applyAction?.executionSettings.headless).toBe(false);
    expect(applyAction?.updatedAt).toBe('2026-04-30T00:00:00.000Z');
    expect(resolveJobApplicationApplyHeadless(updatedActions)).toBe(false);
    expect(resolveJobApplicationApplyActionConnection(updatedActions)?.isSeedFallback).toBe(false);
  });
});
