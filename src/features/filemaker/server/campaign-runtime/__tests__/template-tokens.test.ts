import { describe, expect, it } from 'vitest';

import { applyCampaignRecipientTemplateTokens } from '../runtime-utils';

const tokenInput = {
  emailAddress: 'jan@example.com',
  unsubscribeUrl: 'https://app.example.com/unsubscribe',
  preferencesUrl: 'https://app.example.com/preferences',
  manageAllPreferencesUrl: 'https://app.example.com/preferences/all',
  openTrackingUrl: 'https://app.example.com/open.gif',
  campaignId: 'campaign-1',
  runId: 'run-1',
  deliveryId: 'delivery-1',
  nowMs: Date.parse('2026-03-27T10:00:00.000Z'),
};

describe('campaign recipient template tokens', () => {
  it('appends managed text preference links when the body omits them', () => {
    const result = applyCampaignRecipientTemplateTokens('Hello {{email}}', {
      ...tokenInput,
      htmlMode: false,
    });

    expect(result).toContain('Hello jan@example.com');
    expect(result).toContain('Manage campaign email preferences: https://app.example.com/preferences');
    expect(result).toContain('Unsubscribe: https://app.example.com/unsubscribe');
  });

  it('does not duplicate managed preference links when unsubscribe token is present', () => {
    const result = applyCampaignRecipientTemplateTokens('Opt out: {{unsubscribe_url}}', {
      ...tokenInput,
      htmlMode: false,
    });

    expect(result).toBe('Opt out: https://app.example.com/unsubscribe');
  });

  it('appends managed HTML preference links when the HTML body omits them', () => {
    const result = applyCampaignRecipientTemplateTokens('<p>Hello</p>', {
      ...tokenInput,
      htmlMode: true,
    });

    expect(result).toContain('<p>Hello</p>');
    expect(result).toContain('<a href="https://app.example.com/preferences">preferences</a>');
    expect(result).toContain('<a href="https://app.example.com/unsubscribe">unsubscribe</a>');
  });
});
