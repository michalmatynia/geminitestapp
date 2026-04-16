// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
  toast: vi.fn(),
  confirm: vi.fn(),
  clearActiveRunError: vi.fn(),
  setPreviewMode: vi.fn(),
  setSelectedSlotId: vi.fn(),
  setWorkingSlotId: vi.fn(),
  setTemporaryObjectUpload: vi.fn(),
  deleteSlotMutateAsync: vi.fn(),
  setTool: vi.fn(),
  setMaskShapes: vi.fn(),
  setActiveMaskId: vi.fn(),
  setSelectedPointIndex: vi.fn(),
  registerPreviewCanvasViewportCropResolver: vi.fn(),
  registerPreviewCanvasImageFrameResolver: vi.fn(),
  resetCanvasImageOffset: vi.fn(),
  toggleFocusMode: vi.fn(),
  setScreenshotBusy: vi.fn(),
  setSingleVariantView: vi.fn(),
  setSplitVariantView: vi.fn(),
  setLeftSplitZoom: vi.fn(),
  setRightSplitZoom: vi.fn(),
  setVariantLoadingId: vi.fn(),
  setVariantTooltip: vi.fn(),
  setDetailsSlotId: vi.fn(),
  setCompareVariantIds: vi.fn(),
  setCompareVariantLookup: vi.fn(),
  setDismissedVariantKeys: vi.fn(),
  setVariantTimestampQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirm,
    ConfirmationModal: () => <div data-testid='confirmation-modal'>Confirm</div>,
  }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateImageStudioSlots: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  FocusModeTogglePortal: () => <div data-testid='focus-toggle-portal'>Focus Toggle</div>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('./center-preview/CenterPreviewContext', () => ({
  CenterPreviewProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCenterPreviewContext: () => ({
    setScreenshotBusy: mocks.setScreenshotBusy,
    singleVariantView: 'generated',
    setSingleVariantView: mocks.setSingleVariantView,
    splitVariantView: false,
    setSplitVariantView: mocks.setSplitVariantView,
    setLeftSplitZoom: mocks.setLeftSplitZoom,
    setRightSplitZoom: mocks.setRightSplitZoom,
    variantLoadingId: null,
    setVariantLoadingId: mocks.setVariantLoadingId,
    setVariantTooltip: mocks.setVariantTooltip,
    setDetailsSlotId: mocks.setDetailsSlotId,
  }),
}));

vi.mock('./center-preview/useCenterPreviewVariants', () => ({
  useCenterPreviewVariants: () => ({
    activeVariantId: null,
    buildVariantDismissKeys: () => [],
    canCompareSelectedVariants: false,
    compareVariantA: null,
    compareVariantB: null,
    compareVariantIds: [],
    compareVariantImageA: null,
    compareVariantImageB: null,
    filteredVariantThumbnails: [],
    setCompareVariantIds: mocks.setCompareVariantIds,
    setCompareVariantLookup: mocks.setCompareVariantLookup,
    setDismissedVariantKeys: mocks.setDismissedVariantKeys,
    setVariantTimestampQuery: mocks.setVariantTimestampQuery,
    variantTimestampQuery: '',
    visibleVariantThumbnails: [],
  }),
}));

vi.mock('./center-preview/variant-actions', () => ({
  deleteVariantFromCenterPreview: vi.fn(),
  loadVariantIntoCanvas: vi.fn(),
}));

vi.mock('./center-preview/variant-thumbnails', () => ({
  isTreeRevealableCardSlot: () => false,
  resolveSourceSlotIdFromGeneratedPath: () => null,
  resolveVariantSlotIdForCenterPreview: () => null,
}));

vi.mock('./center-preview/VariantPanelContext', () => ({
  VariantPanelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./center-preview/VariantPanel', () => ({
  VariantPanel: () => <div data-testid='variant-panel'>Variant Panel</div>,
}));

vi.mock('./center-preview/VariantTooltipPortal', () => ({
  VariantTooltipPortal: () => <div data-testid='variant-tooltip-portal'>Variant Tooltip</div>,
}));

vi.mock('./center-preview/CenterPreviewDetailsModal', () => ({
  CenterPreviewDetailsModal: () => <div data-testid='details-modal'>Details Modal</div>,
}));

vi.mock('./center-preview/preview-utils', () => ({
  asObjectRecord: (value: unknown) => (value && typeof value === 'object' ? value : {}),
}));

vi.mock('./center-preview/sections/CenterPreviewCanvas', () => ({
  CenterPreviewCanvas: () => <div data-testid='center-preview-canvas'>Center Preview Canvas</div>,
}));

vi.mock('./center-preview/sections/CenterPreviewCanvasContext', () => ({
  CenterPreviewCanvasSectionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./center-preview/sections/CenterPreviewHeader', () => ({
  CenterPreviewHeader: () => <div data-testid='center-preview-header'>Center Preview Header</div>,
}));

vi.mock('./center-preview/sections/CenterPreviewHeaderContext', () => ({
  CenterPreviewHeaderSectionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('../context/GenerationContext', () => ({
  useGenerationState: () => ({
    landingSlots: [],
    activeRunError: null,
    activeRunId: null,
    activeRunSourceSlotId: null,
  }),
  useGenerationActions: () => ({
    clearActiveRunError: mocks.clearActiveRunError,
  }),
}));

vi.mock('../context/MaskingContext', () => ({
  useMaskingState: () => ({
    tool: 'select',
    maskShapes: [],
    activeMaskId: null,
    selectedPointIndex: null,
    brushRadius: 12,
    maskInvert: false,
    maskFeather: 0,
  }),
  useMaskingActions: () => ({
    setTool: mocks.setTool,
    setMaskShapes: mocks.setMaskShapes,
    setActiveMaskId: mocks.setActiveMaskId,
    setSelectedPointIndex: mocks.setSelectedPointIndex,
  }),
}));

vi.mock('../context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
    projectsQuery: {
      data: [
        {
          id: 'project-1',
          canvasWidth: 1024,
          canvasHeight: 1024,
        },
      ],
      isLoading: false,
    },
  }),
}));

vi.mock('../context/SlotsContext', () => ({
  useSlotsState: () => ({
    workingSlot: null,
    selectedSlot: null,
    selectedSlotId: null,
    previewMode: 'image',
    captureRef: { current: null },
    slots: [],
    temporaryObjectUpload: null,
  }),
  useSlotsActions: () => ({
    setPreviewMode: mocks.setPreviewMode,
    setSelectedSlotId: mocks.setSelectedSlotId,
    setWorkingSlotId: mocks.setWorkingSlotId,
    setTemporaryObjectUpload: mocks.setTemporaryObjectUpload,
    deleteSlotMutation: {
      isPending: false,
      mutateAsync: mocks.deleteSlotMutateAsync,
    },
  }),
}));

vi.mock('../context/UiContext', () => ({
  useUiState: () => ({
    isFocusMode: false,
    maskPreviewEnabled: false,
    previewCanvasSize: 'regular',
    pendingSequenceThumbnail: null,
  }),
  useUiActions: () => ({
    registerPreviewCanvasViewportCropResolver: mocks.registerPreviewCanvasViewportCropResolver,
    registerPreviewCanvasImageFrameResolver: mocks.registerPreviewCanvasImageFrameResolver,
    resetCanvasImageOffset: mocks.resetCanvasImageOffset,
    toggleFocusMode: mocks.toggleFocusMode,
  }),
}));

vi.mock('../context/VersionGraphContext', () => ({
  useVersionGraphState: () => ({
    compositeResultCache: new Map(),
    compositeLoading: false,
  }),
}));

import { CenterPreview } from './CenterPreview';

describe('CenterPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the core preview shell and defers noncritical preview panels', async () => {
    render(<CenterPreview />);

    expect(screen.getByTestId('center-preview-header')).toBeInTheDocument();
    expect(screen.getByTestId('center-preview-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('focus-toggle-portal')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    expect(await screen.findByTestId('variant-tooltip-portal')).toBeInTheDocument();
    expect(await screen.findByTestId('variant-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('details-modal')).toBeInTheDocument();
  });
});
