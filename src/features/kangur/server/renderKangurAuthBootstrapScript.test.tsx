/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import type { ReactElement } from 'react';

import {
  KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID,
  renderKangurAuthBootstrapScript,
} from '@/features/kangur/server/renderKangurAuthBootstrapScript';

describe('renderKangurAuthBootstrapScript', () => {
  it('returns a JSON data island script element with the bootstrap data', () => {
    const bootstrapJson = 'null';
    const result = renderKangurAuthBootstrapScript(bootstrapJson);
    const script = result as ReactElement<{
      dangerouslySetInnerHTML?: { __html?: string };
      id?: string;
      type?: string;
    }>;

    expect(script.type).toBe('script');
    expect(script.props.type).toBe('application/json');
    expect(script.props.id).toBe(KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID);
    expect(script.props.dangerouslySetInnerHTML?.__html).toBe(bootstrapJson);
  });

  it('returns null when there is no bootstrap data to render', () => {
    expect(renderKangurAuthBootstrapScript(null)).toBeNull();
    expect(renderKangurAuthBootstrapScript('')).toBeNull();
  });
});
