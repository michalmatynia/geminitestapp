import { describe, expect, it } from 'vitest';

import * as tooltipEnginePublic from './public';

describe('tooltip-engine public barrel', () => {
  it('continues exposing the tooltip UI components', () => {
    expect(tooltipEnginePublic).toHaveProperty('DocumentationTooltip');
    expect(tooltipEnginePublic).toHaveProperty('DocumentationTooltipEnhancer');
  });

  it('continues exposing the tooltip runtime helpers', () => {
    expect(tooltipEnginePublic).toHaveProperty('createDocsTooltipIntegration');
    expect(tooltipEnginePublic).toHaveProperty('useDocsTooltipsSetting');
    expect(tooltipEnginePublic).toHaveProperty('getDocumentationTooltip');
    expect(tooltipEnginePublic).toHaveProperty('formatDocumentationTooltip');
  });
});
