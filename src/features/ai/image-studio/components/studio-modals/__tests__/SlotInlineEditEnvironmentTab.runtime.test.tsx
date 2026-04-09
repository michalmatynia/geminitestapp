import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_ENVIRONMENT_REFERENCE_DRAFT } from '../slot-inline-edit-utils';
import { SlotInlineEditEnvironmentTab } from '../SlotInlineEditEnvironmentTab';

const mocks = vi.hoisted(() => ({
  onUploadEnvironmentFromDrive: vi.fn(),
  onUploadEnvironmentFromLocal: vi.fn(),
  setEnvironmentPreviewNaturalSize: vi.fn(),
  setEnvironmentReferenceDraft: vi.fn(),
  runtime: {
    environmentPreviewDimensions: '512 x 512',
    environmentPreviewSource: {
      rawSource: '/files/environment.png',
      resolvedSource: 'https://example.test/environment.png',
      sourceType: 'reference',
      src: 'https://example.test/environment.png',
    },
    environmentReferenceDraft: {
      filename: 'environment.png',
      imageFileId: 'env-file-1',
      imageUrl: 'https://example.test/environment.png',
      mimetype: 'image/png',
      size: 2048,
      updatedAt: '2026-03-07T08:00:00.000Z',
      width: 512,
      height: 512,
    },
    selectedSlot: {
      name: 'Card Alpha',
    },
    slotNameDraft: 'Card Alpha',
    uploadPending: false,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    Hint: mocks.MockHint,
    TabsContent: mocks.MockTabsContent,
  };
});

vi.mock('../InlineImagePreviewCanvas', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    InlineImagePreviewCanvas: mocks.MockInlineImagePreviewCanvas,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      environmentPreviewDimensions: mocks.runtime.environmentPreviewDimensions,
      environmentPreviewSource: mocks.runtime.environmentPreviewSource,
      environmentReferenceDraft: mocks.runtime.environmentReferenceDraft,
      onUploadEnvironmentFromDrive: mocks.onUploadEnvironmentFromDrive,
      onUploadEnvironmentFromLocal: mocks.onUploadEnvironmentFromLocal,
      selectedSlot: mocks.runtime.selectedSlot,
      setEnvironmentPreviewNaturalSize: mocks.setEnvironmentPreviewNaturalSize,
      setEnvironmentReferenceDraft: mocks.setEnvironmentReferenceDraft,
      slotNameDraft: mocks.runtime.slotNameDraft,
      uploadPending: mocks.runtime.uploadPending,
    }));
  }
);

describe('SlotInlineEditEnvironmentTab runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.environmentPreviewDimensions = '512 x 512';
    mocks.runtime.environmentPreviewSource = {
      rawSource: '/files/environment.png',
      resolvedSource: 'https://example.test/environment.png',
      sourceType: 'reference',
      src: 'https://example.test/environment.png',
    };
    mocks.runtime.environmentReferenceDraft = {
      filename: 'environment.png',
      imageFileId: 'env-file-1',
      imageUrl: 'https://example.test/environment.png',
      mimetype: 'image/png',
      size: 2048,
      updatedAt: '2026-03-07T08:00:00.000Z',
      width: 512,
      height: 512,
    };
    mocks.runtime.selectedSlot = {
      name: 'Card Alpha',
    };
    mocks.runtime.slotNameDraft = 'Card Alpha';
    mocks.runtime.uploadPending = false;
  });

  it('renders environment metadata and forwards upload and clear actions', () => {
    render(<SlotInlineEditEnvironmentTab />);

    expect(screen.getByTestId('tabs-content')).toHaveAttribute('data-value', 'environment');
    expect(screen.getByText('Environment Reference')).toBeInTheDocument();
    expect(
      screen.getByText('Preview:Card Alpha environment reference:https://example.test/environment.png')
    ).toBeInTheDocument();
    expect(screen.getByText('Source: reference')).toBeInTheDocument();
    expect(screen.getByText('Image file id:')).toBeInTheDocument();
    expect(screen.getByText('env-file-1')).toBeInTheDocument();
    expect(screen.getByText('Filename:')).toBeInTheDocument();
    expect(screen.getByText('environment.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upload Environment From Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload Environment From Local' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Environment Image' }));

    expect(mocks.onUploadEnvironmentFromDrive).toHaveBeenCalledTimes(1);
    expect(mocks.onUploadEnvironmentFromLocal).toHaveBeenCalledTimes(1);
    expect(mocks.setEnvironmentReferenceDraft).toHaveBeenCalledWith({
      ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
    });
    expect(mocks.setEnvironmentPreviewNaturalSize).toHaveBeenCalledWith(null);
  });

  it('disables local upload and clear when no environment image is available', () => {
    mocks.runtime.environmentReferenceDraft = {
      ...EMPTY_ENVIRONMENT_REFERENCE_DRAFT,
    };
    mocks.runtime.uploadPending = true;

    render(<SlotInlineEditEnvironmentTab />);

    expect(screen.getByRole('button', { name: 'Upload Environment From Local' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Environment Image' })).toBeDisabled();
  });
});
