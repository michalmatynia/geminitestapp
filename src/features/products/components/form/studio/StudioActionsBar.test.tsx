/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioActionsBar } from './StudioActionsBar';

const { useProductStudioContextMock } = vi.hoisted(() => ({
  useProductStudioContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductStudioContext', () => ({
  useProductStudioContext: useProductStudioContextMock,
}));

vi.mock('@/shared/ui/alert', () => ({
  Alert: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <div role='alert' data-variant={variant}>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) => <button disabled={disabled} type='button'>{children}</button>,
}));

vi.mock('@/shared/ui/status-badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

describe('StudioActionsBar', () => {
  beforeEach(() => {
    useProductStudioContextMock.mockReturnValue({
      accepting: false,
      blockSendForSequenceReadiness: false,
      handleAcceptVariant: vi.fn(),
      handleConvertLinkImageToFile: vi.fn(),
      handleOpenInImageStudio: vi.fn(),
      handleRotateImageSlot: vi.fn(),
      handleSendToStudio: vi.fn(),
      convertingLinkImageIndex: null,
      openingInImageStudio: false,
      refreshVariants: vi.fn(),
      rotatingDirection: null,
      runStatus: null,
      selectedImageIndex: 0,
      selectedSourcePreview: {
        index: 0,
        sourceType: 'file',
      },
      selectedVariant: null,
      sending: false,
      sequenceReadinessMessage: null,
      studioActionError:
        'OpenAI API key is not configured. Add it in /admin/brain?tab=providers.',
      variantsLoading: false,
    });
  });

  it('renders configuration routes in Studio action errors as links', () => {
    render(<StudioActionsBar />);

    const link = screen.getByRole('link', { name: 'AI Brain provider settings' });
    expect(link).toHaveAttribute('href', '/admin/brain?tab=providers');
    expect(screen.getByRole('alert')).toHaveTextContent('OpenAI API key is not configured.');
  });

  it('renders OpenAI billing-limit support links in Studio action errors', () => {
    useProductStudioContextMock.mockReturnValue({
      ...useProductStudioContextMock(),
      studioActionError:
        'OpenAI rejected Image Studio generation because the API key source has reached a billing hard limit. ' +
        'OpenAI limits: https://platform.openai.com/settings/organization/limits. ' +
        'OpenAI billing: https://platform.openai.com/settings/organization/billing/overview. ' +
        'AI Brain route/provider keys: /admin/brain?tab=routing, /admin/brain?tab=providers.',
    });

    render(<StudioActionsBar />);

    expect(screen.getByRole('link', { name: 'OpenAI limits' })).toHaveAttribute(
      'href',
      'https://platform.openai.com/settings/organization/limits'
    );
    expect(screen.getByRole('link', { name: 'OpenAI billing' })).toHaveAttribute(
      'href',
      'https://platform.openai.com/settings/organization/billing/overview'
    );
    expect(screen.getByRole('link', { name: 'AI Brain routing settings' })).toHaveAttribute(
      'href',
      '/admin/brain?tab=routing'
    );
    expect(screen.getByRole('link', { name: 'AI Brain provider settings' })).toHaveAttribute(
      'href',
      '/admin/brain?tab=providers'
    );
  });
});
