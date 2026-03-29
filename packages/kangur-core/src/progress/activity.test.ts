import { describe, expect, it } from 'vitest';

import { resolveRewardOperation } from './activity';

describe('resolveRewardOperation', () => {
  it('prefers an explicit operation when provided', () => {
    expect(
      resolveRewardOperation({
        operation: ' addition ',
        lessonKey: 'clock',
        activityKey: 'daily:logical_patterns',
      }),
    ).toBe('addition');
  });

  it('maps lesson keys to their canonical operation', () => {
    expect(resolveRewardOperation({ lessonKey: ' geometry_shapes ' })).toBe('geometry');
  });

  it('maps namespaced and bare activity keys to their canonical operation', () => {
    expect(resolveRewardOperation({ activityKey: 'daily:logical_patterns' })).toBe('logical');
    expect(resolveRewardOperation({ activityKey: 'clock' })).toBe('clock');
  });

  it('returns null when no usable token is present', () => {
    expect(resolveRewardOperation({ activityKey: 'daily:   ' })).toBeNull();
    expect(resolveRewardOperation({})).toBeNull();
  });
});
