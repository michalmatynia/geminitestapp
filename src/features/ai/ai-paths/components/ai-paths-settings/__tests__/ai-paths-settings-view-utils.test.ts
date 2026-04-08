import { describe, expect, it } from 'vitest';

import {
  buildSwitchPathOptions,
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

  it('includes folder context in switch options when paths are grouped', () => {
    expect(
      buildSwitchPathOptions([
        {
          id: 'path_alpha',
          name: 'Alpha',
          folderPath: 'drafts/seo',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
    ).toEqual([
      {
        value: 'path_alpha',
        label: 'drafts/seo / Alpha',
      },
    ]);
  });
});
