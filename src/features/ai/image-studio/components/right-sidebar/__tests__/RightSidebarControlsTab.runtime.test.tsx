import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarControlsTab } from '../RightSidebarControlsTab';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  onApplyCanvasSizePreset: vi.fn(),
  onOpenResizeCanvasModal: vi.fn(),
  resetCanvasImageOffset: vi.fn(),
  setCanvasBackgroundColor: vi.fn(),
  setCanvasBackgroundLayerEnabled: vi.fn(),
  setCanvasSelectionEnabled: vi.fn(),
  setCompositeAssetIds: vi.fn(),
  setImageTransformMode: vi.fn(),
  setTool: vi.fn(),
  setCanvasSizePresetValue: vi.fn(),
  runtime: {
    canvasSelectionEnabled: false,
    imageTransformMode: 'move' as 'none' | 'move',
    quickActionsHostEl: null as HTMLElement | null,
  },
}));

vi.mock('@/shared/lib/vector-drawing', () => ({
  VectorDrawingProvider: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div>{children}</div>
  ),
  VectorDrawingToolbar: (): React.JSX.Element => <div>Vector Toolbar</div>,
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    MultiSelect: ({
      onChange,
    }: {
      onChange: (value: string[]) => void;
    }): React.JSX.Element => (
      <button type='button' onClick={() => onChange(['composite-2'])}>
        Update Composite References
      </button>
    ),
    SelectSimple: mocks.MockSelectSimple,
  };
});

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

vi.mock('@/features/ai/image-studio/hooks/useAiPathsObjectAnalysis', () => ({
  useAiPathsObjectAnalysis: () => ({
    status: 'idle',
  }),
}));

vi.mock('../../analysis/sections/AiPathAnalysisTriggerSection', () => ({
  AiPathAnalysisTriggerProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  AiPathAnalysisTriggerSection: (): React.JSX.Element => <div>Analysis Trigger</div>,
}));

vi.mock('../../GenerationToolbar', () => ({
  GenerationToolbar: (): React.JSX.Element => <div>Generation Toolbar</div>,
}));

vi.mock('../../LabeledSlider', () => ({
  LabeledSlider: ({ label }: { label: string }): React.JSX.Element => <div>{label}</div>,
}));

vi.mock('../../StudioCard', () => ({
  StudioCard: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }): React.JSX.Element => (
    <section>
      <div>{label}</div>
      {children}
    </section>
  ),
}));

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiState: () => ({
    imageTransformMode: mocks.runtime.imageTransformMode,
    canvasBackgroundColor: '#ffffff',
    canvasBackgroundLayerEnabled: true,
    canvasSelectionEnabled: mocks.runtime.canvasSelectionEnabled,
  }),
  useUiActions: () => ({
    setImageTransformMode: mocks.setImageTransformMode,
    setCanvasBackgroundColor: mocks.setCanvasBackgroundColor,
    setCanvasBackgroundLayerEnabled: mocks.setCanvasBackgroundLayerEnabled,
    setCanvasSelectionEnabled: mocks.setCanvasSelectionEnabled,
    resetCanvasImageOffset: mocks.resetCanvasImageOffset,
  }),
}));

vi.mock('@/features/ai/image-studio/context/MaskingContext', () => ({
  useMaskingState: () => ({
    tool: 'select',
    maskShapes: [],
    activeMaskId: null,
    selectedPointIndex: null,
    brushRadius: 8,
    maskFeather: 10,
    maskThresholdSensitivity: 55,
    maskEdgeSensitivity: 55,
  }),
  useMaskingActions: () => ({
    setTool: mocks.setTool,
    setMaskShapes: vi.fn(),
    setActiveMaskId: vi.fn(),
    setSelectedPointIndex: vi.fn(),
    setBrushRadius: vi.fn(),
    setMaskFeather: vi.fn(),
    setMaskThresholdSensitivity: vi.fn(),
    setMaskEdgeSensitivity: vi.fn(),
  }),
}));

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-alpha',
    projectsQuery: {
      data: [
        {
          id: 'project-alpha',
          canvasWidthPx: 1024,
          canvasHeightPx: 1024,
        },
      ],
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: () => ({
    workingSlot: {
      id: 'slot-123',
      width: 1024,
      height: 1024,
    },
    selectedSlot: {
      id: 'slot-123',
    },
    compositeAssetIds: ['composite-1'],
    compositeAssetOptions: [
      { value: 'composite-1', label: 'Composite 1' },
      { value: 'composite-2', label: 'Composite 2' },
    ],
  }),
  useSlotsActions: () => ({
    setCompositeAssetIds: mocks.setCompositeAssetIds,
  }),
}));

vi.mock('@/features/ai/image-studio/utils/image-src', () => ({
  getImageStudioSlotImageSrc: () => 'https://example.test/slot.png',
}));

function renderTab(
  overrides: Record<string, unknown> = {}
): void {
  renderWithRightSidebarContext(<RightSidebarControlsTab />, {
    canvasSizePresetOptions: [
      { value: '1024x1024', label: 'Square 1024 x 1024' },
      { value: '1536x1024', label: 'Landscape 1536 x 1024' },
    ],
    canvasSizePresetValue: '1024x1024',
    setCanvasSizePresetValue: mocks.setCanvasSizePresetValue,
    canvasSizeLabel: '1024 x 1024',
    canApplyCanvasSizePreset: true,
    canRecenterCanvasImage: true,
    onApplyCanvasSizePreset: mocks.onApplyCanvasSizePreset,
    onOpenResizeCanvasModal: mocks.onOpenResizeCanvasModal,
    quickActionsHostEl: mocks.runtime.quickActionsHostEl,
    quickActionsPanelContent: <div>Inline Quick Actions</div>,
    resizeCanvasDisabled: false,
    ...overrides,
  });
}

describe('RightSidebarControlsTab runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.imageTransformMode = 'move';
    mocks.runtime.canvasSelectionEnabled = false;
    mocks.runtime.quickActionsHostEl = null;
  });

  it('renders inline quick actions and forwards canvas size controls', () => {
    renderTab();

    expect(screen.getByText('Inline Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Current canvas: 1024 x 1024')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Canvas size preset' }), {
      target: { value: '1536x1024' },
    });
    expect(mocks.setCanvasSizePresetValue).toHaveBeenCalledWith('1536x1024');

    fireEvent.click(screen.getByRole('button', { name: 'Apply canvas size preset' }));
    expect(mocks.onApplyCanvasSizePreset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Resize project canvas' }));
    expect(mocks.onOpenResizeCanvasModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Re-center image on canvas' }));
    expect(mocks.resetCanvasImageOffset).toHaveBeenCalledTimes(1);
  });

  it('suppresses inline quick actions when a host element exists and disables apply when requested', () => {
    mocks.runtime.quickActionsHostEl = document.createElement('div');

    renderTab({
      canApplyCanvasSizePreset: false,
    });

    expect(screen.queryByText('Inline Quick Actions')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply canvas size preset' })).toBeDisabled();
  });
});
