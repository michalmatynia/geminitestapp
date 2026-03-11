import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarRequestPreviewModal } from '../RightSidebarRequestPreviewModal';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  closeRequestPreview: vi.fn(),
}));

vi.mock('@/shared/ui/templates/modals', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock('next/image', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    default: mocks.MockNextImage,
  };
});

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    SelectSimple: mocks.MockSelectSimple,
  };
});

const renderModal = ({
  requestPreviewOpen = true,
}: {
  requestPreviewOpen?: boolean;
} = {}): void => {
  renderWithRightSidebarContext(<RightSidebarRequestPreviewModal />, {
    activeRequestPreviewJson: '{"prompt":"hello"}',
    closeRequestPreview: mocks.closeRequestPreview,
    maskShapeCount: 2,
    requestPreviewOpen,
    resolvedPromptLength: 5,
  });
};

describe('RightSidebarRequestPreviewModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders from RightSidebarContext', () => {
    renderModal();

    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Generation Request Preview')).toBeInTheDocument();
    expect(screen.getByText('`/api/image-studio/run`')).toBeInTheDocument();
    expect(screen.getByText('{"prompt":"hello"}')).toBeInTheDocument();
  });

  it('closes through RightSidebarContext', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mocks.closeRequestPreview).toHaveBeenCalledTimes(1);
  });
});
