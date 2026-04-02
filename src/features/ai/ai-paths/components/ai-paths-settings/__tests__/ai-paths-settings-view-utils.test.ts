import { describe, expect, it } from 'vitest';

import {
  formatStatusLabel,
  statusToVariant,
} from '../ai-paths-settings-view-utils';

describe('ai-paths-settings-view-utils', () => {
  it('maps known statuses to the expected status variants', () => {
    expect(statusToVariant('completed')).toBe('success');
    expect(statusToVariant('ERROR')).toBe('error');
    expect(statusToVariant('handoff_ready')).toBe('warning');
    expect(statusToVariant('waiting_callback')).toBe('processing');
    expect(statusToVariant('custom_status')).toBe('neutral');
  });

  it('formats special and underscored status labels for display', () => {
    expect(formatStatusLabel('waiting_callback')).toBe('Waiting');
    expect(formatStatusLabel('advance_pending')).toBe('Processing');
    expect(formatStatusLabel('blocked_on_lease')).toBe('Blocked On Lease');
  });
});
