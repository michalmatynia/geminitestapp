/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kangurBadgeTrackGridMock } = vi.hoisted(() => ({
  kangurBadgeTrackGridMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurBadgeTrackGrid', () => ({
  default: kangurBadgeTrackGridMock,
}));

import { KangurBadgeTrackSection } from './KangurBadgeTrackSection';

const progress = {} as never;

describe('KangurBadgeTrackSection', () => {
  beforeEach(() => {
    kangurBadgeTrackGridMock.mockImplementation(({ className, dataTestIdPrefix, emptyTestId }) => (
      <div
        data-class-name={className ?? ''}
        data-empty-test-id={emptyTestId}
        data-testid={`${dataTestIdPrefix}-grid`}
      >
        badge-track-grid
      </div>
    ));
  });

  it('renders the shared heading and badge-track grid', () => {
    render(
      <KangurBadgeTrackSection
        dataTestIdPrefix='badge-track-section'
        emptyTestId='badge-track-section-empty'
        headingClassName='text-xs tracking-wide'
        progress={progress}
      />
    );

    expect(screen.getByText('Sciezki odznak')).toHaveClass(
      'text-xs',
      'tracking-wide'
    );
    expect(screen.getByText('Sciezki odznak').parentElement).toHaveClass(
      'flex',
      'flex-col',
      'kangur-panel-gap'
    );
    expect(screen.getByTestId('badge-track-section-grid')).toHaveTextContent('badge-track-grid');
    expect(screen.getByTestId('badge-track-section-grid')).toHaveAttribute(
      'data-empty-test-id',
      'badge-track-section-empty'
    );
  });

  it('passes custom heading content and grid classes through', () => {
    render(
      <KangurBadgeTrackSection
        dataTestIdPrefix='badge-track-section'
        emptyTestId='badge-track-section-empty'
        gridClassName='grid-cols-1'
        heading='Moje odznaki'
        progress={progress}
      />
    );

    expect(screen.getByText('Moje odznaki')).toBeInTheDocument();
    expect(screen.getByTestId('badge-track-section-grid')).toHaveAttribute(
      'data-class-name',
      'grid-cols-1'
    );
  });
});
