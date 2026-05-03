import { describe, expect, it } from 'vitest';

import { validatePlaywrightCaptureRoutes } from './playwright-capture-validator';

describe('validatePlaywrightCaptureRoutes', () => {
  it('flags action-oriented selector roles as invalid capture targets', () => {
    const result = validatePlaywrightCaptureRoutes(
      [
        {
          id: 'route-1',
          title: 'Submit button',
          path: '/checkout',
          description: '',
          selector: 'button[type="submit"]',
          selectorRole: 'submit',
          waitForMs: null,
          waitForSelectorMs: 15000,
        },
      ],
      'https://example.com'
    );

    expect(result.isValid).toBe(false);
    expect(result.firstIssue).toContain('not suitable capture targets');
  });

  it('accepts content-oriented selector roles for capture routes', () => {
    const result = validatePlaywrightCaptureRoutes(
      [
        {
          id: 'route-1',
          title: 'Product title',
          path: '/products/123',
          description: '',
          selector: 'h1',
          selectorRole: 'content_title',
          waitForMs: null,
          waitForSelectorMs: 15000,
        },
      ],
      'https://example.com'
    );

    expect(result.isValid).toBe(true);
    expect(result.firstIssue).toBeNull();
  });
});
