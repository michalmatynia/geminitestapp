import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarRequestPreviewBody } from '../RightSidebarRequestPreviewBody';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  setRequestPreviewMode: vi.fn(),
}));

vi.mock('next/image', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    default: mocks.MockNextImage,
  };
});

vi.mock('@/shared/ui/navigation-and-layout.public', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    InsetPanel: ({
      children,
      className,
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className}>{children}</div>
    ),
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    SelectSimple: mocks.MockSelectSimple,
  };
});

function renderBody(overrides: Record<string, unknown> = {}): void {
  renderWithRightSidebarContext(<RightSidebarRequestPreviewBody />, {
    activeErrors: ['Missing environment reference.'],
    activeImages: [
      {
        filepath: '/images/base.png',
        id: 'base-1',
        kind: 'base',
        name: 'Base Image',
      },
      {
        filepath: '/images/reference.png',
        id: 'reference-1',
        kind: 'reference',
        name: 'Reference Image',
      },
    ],
    activeRequestPreviewJson: '{"prompt":"hello"}',
    maskShapeCount: 2,
    requestPreviewMode: 'without_sequence',
    resolvedPromptLength: 5,
    sequenceStepCount: 3,
    setRequestPreviewMode: mocks.setRequestPreviewMode,
    ...overrides,
  });
}

describe('RightSidebarRequestPreviewBody runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders request preview details and forwards mode changes through context', () => {
    renderBody();

    expect(screen.getByText('`/api/image-studio/run`')).toBeInTheDocument();
    expect(screen.getByText(/Resolved prompt length:/)).toHaveTextContent(
      'Resolved prompt length: 5 · mask shapes in payload: 2'
    );
    expect(screen.getByText('Missing environment reference.')).toBeInTheDocument();
    expect(screen.getByText('Input Images (2)')).toBeInTheDocument();
    expect(screen.getByAltText('Base Image')).toBeInTheDocument();
    expect(screen.getByAltText('Reference Image')).toBeInTheDocument();
    expect(screen.getByText('{"prompt":"hello"}')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview Mode' }), {
      target: { value: 'with_sequence' },
    });

    expect(mocks.setRequestPreviewMode).toHaveBeenCalledWith('with_sequence');
  });

  it('renders the empty-image state and sequence stats when sequence preview is active', () => {
    renderBody({
      activeErrors: [],
      activeImages: [],
      requestPreviewMode: 'with_sequence',
      sequenceStepCount: 4,
    });

    expect(screen.getByText(/enabled steps:/)).toHaveTextContent('enabled steps: 4');
    expect(screen.getByText('Input Images (0)')).toBeInTheDocument();
    expect(screen.getByText('No request images are available yet.')).toBeInTheDocument();
    expect(screen.queryByText('Missing environment reference.')).not.toBeInTheDocument();
  });
});
