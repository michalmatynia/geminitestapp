import { describe, expect, it } from 'vitest';

import { createPlaywrightStepCodeSnapshot } from './step-code-preview';

describe('createPlaywrightStepCodeSnapshot', () => {
  it('annotates selector registry bindings with semantic role compatibility', () => {
    const snapshot = createPlaywrightStepCodeSnapshot({
      type: 'fill',
      selector: 'button[type="submit"]',
      inputBindings: {
        selector: {
          mode: 'selectorRegistry',
          selectorNamespace: 'tradera',
          selectorKey: 'tradera.title.submit',
          selectorProfile: 'profile-market-a',
          selectorRole: 'submit',
          fallbackSelector: 'button[type="submit"]',
        },
      },
    });

    expect(snapshot.selectorBindings).toHaveLength(1);
    expect(snapshot.selectorBindings[0]).toMatchObject({
      field: 'selector',
      selectorRole: 'submit',
      roleMatchesExpected: false,
      expectedRoles: ['input', 'generic'],
      connected: true,
    });
  });
});
