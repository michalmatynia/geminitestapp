import { render, screen } from '@testing-library/react';
import type { CSSProperties, ReactNode } from 'react';

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

type SpotlightHarnessProps = {
  guidedMode?: 'auth' | 'home_onboarding' | 'section' | 'selection' | null;
  sectionContextSpotlightStyle?: CSSProperties | null;
  sectionDropHighlightStyle?: CSSProperties | null;
  selectionGlowStyles?: CSSProperties[];
  selectionContextSpotlightStyle?: CSSProperties | null;
  selectionSpotlightStyle?: CSSProperties | null;
};

function SpotlightOverlaysStylesHarness({
  guidedMode = null,
  sectionContextSpotlightStyle = null,
  sectionDropHighlightStyle = null,
  selectionGlowStyles = [],
  selectionContextSpotlightStyle = null,
  selectionSpotlightStyle = null,
}: SpotlightHarnessProps): ReactNode {
  const widgetState = useKangurAiTutorWidgetState();

  return (
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorSpotlightOverlays
        guidedMode={guidedMode}
        prefersReducedMotion={false}
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionContextSpotlightStyle={sectionContextSpotlightStyle}
        sectionDropHighlightStyle={sectionDropHighlightStyle}
        selectionGlowStyles={selectionGlowStyles}
        selectionContextSpotlightStyle={selectionContextSpotlightStyle}
        selectionSpotlightStyle={selectionSpotlightStyle}
      />
    </KangurAiTutorWidgetStateProvider>
  );
}

describe('KangurAiTutorSpotlightOverlays', () => {
  it('uses a visible inline light-mode selection emphasis instead of transparent text fill', () => {
    const { container } = render(<SpotlightOverlaysHarness />);
    const style = container.querySelector('style');

    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-inline-text: rgb(120 53 15);'
    );
    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-inline-fill: rgba(245, 158, 11, 0.18);'
    );
    expect(style?.textContent).toContain(
      '--kangur-ai-tutor-selection-inline-shadow: rgba(217, 119, 6, 0.14);'
    );
    expect(style?.textContent).toContain(
      "color: var(--kangur-ai-tutor-selection-inline-text);"
    );
    expect(style?.textContent).toContain('-webkit-box-decoration-break: clone;');
  });

  it('scopes the dark override to Kangur appearance attributes instead of the global dark class', () => {
    const { container } = render(<SpotlightOverlaysHarness />);
    const style = container.querySelector('style');

    expect(style?.textContent).toContain("data-kangur-appearance='dark'");
    expect(style?.textContent).toContain("data-kangur-appearance='sunset'");
    expect(style?.textContent).toContain("data-kangur-appearance-mode='dark'");
    expect(style?.textContent).toContain("data-kangur-appearance-mode='sunset'");
    expect(style?.textContent).not.toContain('.dark {');
  });

  it('only uses transparent clipped text for the dark appearance override', () => {
    const { container } = render(<SpotlightOverlaysHarness />);
    const style = container.querySelector('style');

    expect(style?.textContent).toContain("data-kangur-ai-tutor-selection-emphasis='gradient'");
    expect(style?.textContent).toContain("data-kangur-appearance='sunset'");
    expect(style?.textContent).toContain('-webkit-text-fill-color: transparent;');
    expect(style?.textContent).toMatch(
      /@supports[\s\S]*?\n\s*\[data-kangur-ai-tutor-selection-emphasis='gradient'\]\s*\{[\s\S]*?-webkit-text-fill-color:\s*transparent;/
    );
  });

  it('renders themed spotlight utility classes for selection glow and contextual frames', () => {
    render(
      <SpotlightOverlaysStylesHarness
        guidedMode='selection'
        selectionGlowStyles={[{ left: 12, top: 18, width: 84, height: 28 }]}
        selectionContextSpotlightStyle={{ left: 20, top: 32, width: 160, height: 48 }}
        sectionContextSpotlightStyle={{ left: 28, top: 92, width: 180, height: 56 }}
        sectionDropHighlightStyle={{ left: 36, top: 160, width: 200, height: 72 }}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-selection-glow')).toHaveClass(
      'kangur-chat-spotlight-glow'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toHaveClass(
      'kangur-chat-spotlight-frame'
    );
    expect(screen.getByTestId('kangur-ai-tutor-section-context-spotlight')).toHaveClass(
      'kangur-chat-spotlight-frame'
    );
    expect(screen.getByTestId('kangur-ai-tutor-section-drop-highlight')).toHaveClass(
      'kangur-chat-spotlight-frame'
    );
  });

  it('renders the aggregated selection spotlight with the dedicated themed selection chrome', () => {
    render(
      <SpotlightOverlaysStylesHarness
        guidedMode='selection'
        selectionSpotlightStyle={{ left: 12, top: 18, width: 96, height: 32 }}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveClass(
      'kangur-chat-selection-spotlight'
    );
  });
});
