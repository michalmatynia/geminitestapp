import { describe, expect, it } from 'vitest';

import { isVintedBrowserAuthRequiredMessage } from './vinted-browser-session';

describe('isVintedBrowserAuthRequiredMessage', () => {
  it('matches explicit auth-required failures', () => {
    expect(
      isVintedBrowserAuthRequiredMessage(
        'AUTH_REQUIRED: Vinted session expired or manual verification is incomplete.'
      )
    ).toBe(true);
  });

  it('matches softer verification failures used by the Vinted browser flow', () => {
    expect(
      isVintedBrowserAuthRequiredMessage('Vinted login could not be verified.')
    ).toBe(true);
    expect(
      isVintedBrowserAuthRequiredMessage(
        'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
      )
    ).toBe(true);
    expect(
      isVintedBrowserAuthRequiredMessage(
        'AUTH_REQUIRED: Google sign-in is blocked in this automated browser. Use Vinted.pl email/password login instead of Continue with Google.'
      )
    ).toBe(true);
  });

  it('does not classify unrelated failures as auth-required', () => {
    expect(
      isVintedBrowserAuthRequiredMessage('Vinted price field not found.')
    ).toBe(false);
  });
});
