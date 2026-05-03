import { describe, expect, it } from 'vitest';

import { resolveStepSequencerActionHref } from './step-sequencer-action-links';

describe('resolveStepSequencerActionHref', () => {
  it('builds the sequencer action href when an action id is provided', () => {
    expect(resolveStepSequencerActionHref('draft-action-1')).toBe(
      '/admin/playwright/step-sequencer?actionId=draft-action-1'
    );
  });

  it('falls back to the sequencer root when the action id is empty', () => {
    expect(resolveStepSequencerActionHref('')).toBe('/admin/playwright/step-sequencer');
    expect(resolveStepSequencerActionHref('   ')).toBe('/admin/playwright/step-sequencer');
    expect(resolveStepSequencerActionHref(null)).toBe('/admin/playwright/step-sequencer');
  });

  it('encodes reserved characters inside the action id', () => {
    expect(resolveStepSequencerActionHref('draft/action?x=1')).toBe(
      '/admin/playwright/step-sequencer?actionId=draft%2Faction%3Fx%3D1'
    );
  });

  it('includes a linked block ref id when provided', () => {
    expect(resolveStepSequencerActionHref('draft-action-1', 'step/ref?x=1')).toBe(
      '/admin/playwright/step-sequencer?actionId=draft-action-1&blockRefId=step%2Fref%3Fx%3D1'
    );
  });
});
