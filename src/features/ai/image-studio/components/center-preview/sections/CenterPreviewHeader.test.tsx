// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import { CenterPreviewHeader } from './CenterPreviewHeader';
import { CenterPreviewHeaderSectionProvider } from './CenterPreviewHeaderContext';

const mocks = vi.hoisted(() => ({
  onSaveScreenshot: vi.fn(),
  setPreviewMode: vi.fn(),
  screenshotBusy: false,
  slotsState: {
    workingSlot: null as ImageStudioSlotRecord | null,
    previewMode: 'image' as 'image' | '3d',
  },
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: () => mocks.slotsState,
  useSlotsActions: () => ({
    setPreviewMode: mocks.setPreviewMode,
  }),
}));

vi.mock('../CenterPreviewContext', () => ({
  useCenterPreviewContext: () => ({
    screenshotBusy: mocks.screenshotBusy,
  }),
}));

const renderHeader = (): void => {
  render(
    <CenterPreviewHeaderSectionProvider value={{ onSaveScreenshot: mocks.onSaveScreenshot }}>
      <CenterPreviewHeader />
    </CenterPreviewHeaderSectionProvider>
  );
};

describe('CenterPreviewHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.screenshotBusy = false;
    mocks.slotsState.workingSlot = null;
    mocks.slotsState.previewMode = 'image';
  });

  it('renders without preview controls when no working slot is selected', () => {
    renderHeader();

    expect(screen.queryByRole('button', { name: 'Image' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3D' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save shot/i })).not.toBeInTheDocument();
  });

  it('shows 3D controls for a working slot with a 3D asset', () => {
    mocks.slotsState.workingSlot = {
      id: 'slot-1',
      projectId: 'project-1',
      label: 'Slot 1',
      asset3dId: 'asset-3d-1',
      imageUrl: null,
      base64: null,
      generatedPath: null,
      folder: 'Root',
      order: 0,
      generationIds: [],
      metadata: {},
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    } as ImageStudioSlotRecord;
    mocks.slotsState.previewMode = '3d';

    renderHeader();

    expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save shot/i })).toBeInTheDocument();
  });
});
