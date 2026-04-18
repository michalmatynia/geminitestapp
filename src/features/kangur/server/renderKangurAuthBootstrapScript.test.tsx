/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import type { ReactElement } from 'react';

import { renderKangurAuthBootstrapScript } from '@/features/kangur/server/renderKangurAuthBootstrapScript';

describe('renderKangurAuthBootstrapScript', () => {
  it('returns a hidden inline script with deterministic bootstrap props', () => {
    const scriptCode = 'window.__KANGUR_AUTH_BOOTSTRAP__=null;';
    const result = renderKangurAuthBootstrapScript(scriptCode);
    const script = result as ReactElement<{
      dangerouslySetInnerHTML?: { __html?: string };
      style?: { display?: string };
    }>;

    expect(script.type).toBe('script');
    expect(script.props.style).toEqual({ display: 'none' });
    expect(script.props.dangerouslySetInnerHTML?.__html).toBe(scriptCode);
  });

  it('returns null when there is no bootstrap script to render', () => {
    expect(renderKangurAuthBootstrapScript(null)).toBeNull();
    expect(renderKangurAuthBootstrapScript('')).toBeNull();
  });
});
