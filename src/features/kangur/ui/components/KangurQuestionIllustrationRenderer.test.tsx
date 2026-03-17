/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurQuestionIllustrationRenderer } from '@/features/kangur/ui/components/KangurQuestionIllustrationRenderer';

describe('KangurQuestionIllustrationRenderer', () => {
  it('sanitizes single-svg illustrations before rendering', () => {
    const { container } = render(
      <KangurQuestionIllustrationRenderer
        illustration={{
          type: 'single',
          svgContent:
            '<svg viewBox="0 0 10 10"><script>alert(1)</script><image href="/uploads/kangur/example.png" /><circle cx="5" cy="5" r="4" /></svg>',
        }}
      />
    );

    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('.png');
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('circle')).not.toBeNull();
    expect(screen.getByTestId('kangur-illustration-single-frame')).toHaveClass(
      'soft-card',
      'border-slate-200/85'
    );
  });

  it('sanitizes panel illustrations before rendering', () => {
    const { container, getByText } = render(
      <KangurQuestionIllustrationRenderer
        illustration={{
          type: 'panels',
          layout: 'row',
          panels: [
            {
              id: 'panel-1',
              label: 'A',
              svgContent:
                '<svg viewBox="0 0 10 10"><image href="https://example.com/image.png" /><rect x="1" y="1" width="8" height="8" /></svg>',
              description: 'Pierwszy panel',
            },
          ],
        }}
      />
    );

    expect(getByText('A')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('image.png');
    expect(container.querySelector('rect')).not.toBeNull();
    expect(screen.getByTestId('kangur-illustration-panel-label-panel-1')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,rgb(226_232_240))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,rgb(226_232_240))]'
    );
    expect(screen.getByTestId('kangur-illustration-panel-frame-panel-1')).toHaveClass(
      'soft-card',
      'border-slate-200/85'
    );
  });

  it('uses the shared placeholder surface for empty panel slots', () => {
    render(
      <KangurQuestionIllustrationRenderer
        illustration={{
          type: 'panels',
          layout: 'row',
          panels: [
            {
              id: 'panel-empty',
              label: 'B',
              svgContent: '',
              description: 'Brak rysunku',
            },
          ],
        }}
      />
    );

    expect(screen.getByTestId('kangur-illustration-panel-placeholder-panel-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/85'
    );
    expect(screen.getByTestId('kangur-illustration-panel-label-panel-empty')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,rgb(226_232_240))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,rgb(226_232_240))]'
    );
  });

  it('uses mobile-first panel grids for dense illustration layouts', () => {
    const { container } = render(
      <KangurQuestionIllustrationRenderer
        illustration={{
          type: 'panels',
          layout: 'grid-3x2',
          panels: [
            {
              id: 'panel-a',
              label: 'A',
              svgContent: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
              description: 'Panel A',
            },
            {
              id: 'panel-b',
              label: 'B',
              svgContent: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" /></svg>',
              description: 'Panel B',
            },
            {
              id: 'panel-c',
              label: 'C',
              svgContent:
                '<svg viewBox="0 0 10 10"><path d="M1 9 L5 1 L9 9 Z" /></svg>',
              description: 'Panel C',
            },
          ],
        }}
      />
    );

    expect(container.firstElementChild).toHaveClass(
      'grid',
      'grid-cols-1',
      'min-[420px]:grid-cols-2',
      'sm:grid-cols-3'
    );
  });
});
