import React from 'react';
import { describe, expect, it } from 'vitest';

import { getTextContent, resolveAccessibleLabel } from '@/shared/utils/a11y';

describe('a11y helpers', () => {
  it('collects text content from nested arrays and elements', () => {
    const text = getTextContent(['Hello', ['world'], React.createElement('span', null, '!')]);

    expect(text).toContain('Hello');
    expect(text).toContain('world');
    expect(text).toContain('!');
  });

  it('uses title as fallback aria-label when there is no visible text', () => {
    expect(
      resolveAccessibleLabel({
        children: null,
        title: 'Open details',
      })
    ).toEqual(
      expect.objectContaining({
        textContent: '',
        hasText: false,
        ariaLabel: 'Open details',
        hasAccessibleLabel: true,
      })
    );
  });

  it('treats aria-labelledby as an accessible label source', () => {
    expect(
      resolveAccessibleLabel({
        children: null,
        ariaLabelledBy: 'external-label',
      }).hasAccessibleLabel
    ).toBe(true);
  });
});
