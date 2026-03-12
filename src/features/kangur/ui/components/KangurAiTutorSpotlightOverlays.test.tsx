import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import { KangurAiTutorSpotlightOverlays } from './KangurAiTutorSpotlightOverlays';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';

function SpotlightOverlaysHarness(): ReactNode {
  const widgetState = useKangurAiTutorWidgetState();

  return (
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorSpotlightOverlays
        guidedMode={null}
        prefersReducedMotion={false}
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionContextSpotlightStyle={null}
        sectionDropHighlightStyle={null}
        selectionGlowStyles={[]}
        selectionContextSpotlightStyle={null}
        selectionSpotlightStyle={null}
      />
    </KangurAiTutorWidgetStateProvider>
  );
}

describe('KangurAiTutorSpotlightOverlays', () => {
  it('uses a subtle light-mode text gradient palette for selection emphasis', () => {
    const { container } = render(<SpotlightOverlaysHarness />);
    const style = container.querySelector('style');

    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-gradient-fallback: color-mix(in srgb, var(--kangur-page-text) 78%, rgb(146 64 14));'
    );
    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-gradient-start: color-mix(in srgb, var(--kangur-page-text) 90%, rgb(120 53 15));'
    );
    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-gradient-mid: color-mix(in srgb, var(--kangur-page-text) 82%, rgb(146 64 14));'
    );
    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-gradient-end: color-mix(in srgb, var(--kangur-page-text) 72%, rgb(180 83 9));'
    );
  });

  it('scopes the dark override to Kangur appearance attributes instead of the global dark class', () => {
    const { container } = render(<SpotlightOverlaysHarness />);
    const style = container.querySelector('style');

    expect(style?.textContent).toContain('[data-kangur-appearance=\'dark\'],');
    expect(style?.textContent).toContain('[data-kangur-appearance-mode=\'dark\'] {');
    expect(style?.textContent).not.toContain('.dark {');
  });
});
