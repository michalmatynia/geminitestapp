import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildImageStudioAnalysisSourceSignature,
  loadImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisPlanSnapshot,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

import { ImageStudioAnalysisTab } from '../ImageStudioAnalysisTab';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  switchToControls: vi.fn(),
  setSelectedSlotId: vi.fn(),
  setWorkingSlotId: vi.fn(),
  slotState: {
    slots: [] as ImageStudioSlotRecord[],
    slotSelectionLocked: false,
    workingSlot: null as ImageStudioSlotRecord | null,
  },
}));

function getSlotsStateMock() {
  return {
    slots: mocks.slotState.slots,
    slotSelectionLocked: mocks.slotState.slotSelectionLocked,
    workingSlot: mocks.slotState.workingSlot,
  };
}

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Card: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
    useToast: () => ({ toast: mocks.toast }),
  };
});

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => undefined,
  }),
}));

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-alpha',
    projectsQuery: {
      data: [],
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: getSlotsStateMock,
  useSlotsActions: () => ({
    setSelectedSlotId: mocks.setSelectedSlotId,
    setWorkingSlotId: mocks.setWorkingSlotId,
  }),
}));

vi.mock('@/features/ai/image-studio/components/RightSidebarContext', () => ({
  useRightSidebarContext: () => ({
    switchToControls: mocks.switchToControls,
  }),
}));

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiCanvasState: () => ({
    previewCanvasSize: 'regular',
    imageTransformMode: 'none',
    canvasImageOffset: { x: 0, y: 0 },
    canvasBackgroundLayerEnabled: true,
    canvasBackgroundColor: '#ffffff',
  }),
  useUiToolsState: () => ({
    maskPreviewEnabled: false,
    centerGuidesEnabled: false,
    validatorEnabled: true,
    formatterEnabled: false,
    canvasSelectionEnabled: false,
  }),
  useUiActions: () => ({
    setCanvasSelectionEnabled: vi.fn(),
  }),
}));

vi.mock('@/features/ai/image-studio/components/analysis/sections/AnalysisSettingsSection', () => ({
  AnalysisSettingsSection: (): JSX.Element => <div data-testid='analysis-settings' />,
}));

vi.mock('@/features/ai/image-studio/components/analysis/sections/AnalysisResultSection', async () => {
  const React = await import('react');
  const { useImageStudioAnalysisRuntime } = await import(
    '@/features/ai/image-studio/components/analysis/sections/ImageStudioAnalysisRuntimeContext'
  );

  return {
    AnalysisResultSection: (): JSX.Element => {
      const { resultRuntime } = useImageStudioAnalysisRuntime();
      return (
        <div>
          <div data-testid='snapshot-slot'>{resultRuntime.persistedPlanSnapshot?.slotId ?? ''}</div>
          <button
            type='button'
            onClick={() => resultRuntime.queueAnalysisApplyIntent('auto_scaler')}
          >
            Apply To Auto Scaler
          </button>
        </div>
      );
    },
  };
});

const createSnapshot = (
  slotId: string,
  sourceSignature = `signature_${slotId}`
): Omit<ImageStudioAnalysisPlanSnapshot, 'version'> => ({
  slotId,
  sourceSignature,
  savedAt: '2026-02-26T12:00:00.000Z',
  layout: {
    paddingPercent: 8,
    paddingXPercent: 8,
    paddingYPercent: 8,
    splitAxes: false,
    fillMissingCanvasWhite: false,
    targetCanvasWidth: null,
    targetCanvasHeight: null,
    whiteThreshold: 16,
    chromaThreshold: 10,
    shadowPolicy: 'auto',
    detection: 'auto',
  },
  effectiveMode: 'server_analysis',
  authoritativeSource: 'source_slot',
  detectionUsed: 'alpha_bbox',
  confidence: 0.96,
  policyVersion: 'policy_v2',
  policyReason: 'alpha_confident',
  fallbackApplied: false,
});

const createSlotSourceSignature = (slotId: string, imageUrl: string): string =>
  buildImageStudioAnalysisSourceSignature({
    slotId,
    imageUrl,
    resolvedImageSrc: imageUrl,
    clientProcessingImageSrc: imageUrl,
  });

describe('ImageStudioAnalysisTab apply intent routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();

    mocks.slotState.slots = [
      {
        id: 'slot-1',
        name: 'Slot 1',
        imageUrl: 'https://example.test/slot-1.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
      {
        id: 'slot-2',
        name: 'Slot 2',
        imageUrl: 'https://example.test/slot-2.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
    ];
    mocks.slotState.slotSelectionLocked = false;
    mocks.slotState.workingSlot = {
      id: 'slot-1',
      projectId: 'project-alpha',
    } as ImageStudioSlotRecord;
  });

  it('saves intent, pre-switches slot, and switches to controls when analyzed slot is valid', async () => {
    const slot2Url = 'https://example.test/slot-2.png';
    saveImageStudioAnalysisPlanSnapshot(
      'project-alpha',
      createSnapshot('slot-2', createSlotSourceSignature('slot-2', slot2Url))
    );

    render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply To Auto Scaler' }));

    await waitFor(() => {
      const intent = loadImageStudioAnalysisApplyIntent('project-alpha');
      expect(intent).not.toBeNull();
      expect(intent?.slotId).toBe('slot-2');
      expect(intent?.target).toBe('auto_scaler');
    });

    expect(mocks.setSelectedSlotId).toHaveBeenCalledWith('slot-2');
    expect(mocks.setWorkingSlotId).toHaveBeenCalledWith('slot-2');
    expect(mocks.switchToControls).toHaveBeenCalledTimes(1);
  });

  it('has no obvious accessibility violations when a snapshot is ready to apply', async () => {
    const slot2Url = 'https://example.test/slot-2.png';
    saveImageStudioAnalysisPlanSnapshot(
      'project-alpha',
      createSnapshot('slot-2', createSlotSourceSignature('slot-2', slot2Url))
    );

    const { container } = render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    await expectNoAxeViolations(container);
  });

  it('supports keyboard focus on apply intent action', async () => {
    const user = userEvent.setup();
    const slot2Url = 'https://example.test/slot-2.png';
    saveImageStudioAnalysisPlanSnapshot(
      'project-alpha',
      createSnapshot('slot-2', createSlotSourceSignature('slot-2', slot2Url))
    );

    render(<ImageStudioAnalysisTab />);

    const applyButton = await screen.findByRole('button', { name: 'Apply To Auto Scaler' });
    let reachedApplyButton = false;
    for (let index = 0; index < 24; index += 1) {
      await user.tab();
      if (applyButton === document.activeElement) {
        reachedApplyButton = true;
        break;
      }
    }
    expect(reachedApplyButton).toBe(true);
  });

  it('blocks apply when slot selection is locked', async () => {
    mocks.slotState.slotSelectionLocked = true;
    saveImageStudioAnalysisPlanSnapshot(
      'project-alpha',
      createSnapshot(
        'slot-2',
        createSlotSourceSignature('slot-2', 'https://example.test/slot-2.png')
      )
    );

    render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply To Auto Scaler' }));

    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(mocks.setSelectedSlotId).not.toHaveBeenCalled();
    expect(mocks.setWorkingSlotId).not.toHaveBeenCalled();
    expect(mocks.switchToControls).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Cannot apply while slot selection is locked.', {
      variant: 'info',
    });
  });

  it('blocks apply when analyzed slot is missing', async () => {
    mocks.slotState.slots = [
      {
        id: 'slot-1',
        name: 'Slot 1',
        imageUrl: 'https://example.test/slot-1.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
    ];
    saveImageStudioAnalysisPlanSnapshot('project-alpha', createSnapshot('slot-2'));
    render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply To Auto Scaler' }));

    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(mocks.setSelectedSlotId).not.toHaveBeenCalled();
    expect(mocks.setWorkingSlotId).not.toHaveBeenCalled();
    expect(mocks.switchToControls).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Analyzed slot no longer exists. Run analysis again on an available slot.',
      {
        variant: 'info',
      }
    );
  });

  it('blocks apply when analyzed slot source metadata is missing', async () => {
    mocks.slotState.slots = [
      {
        id: 'slot-1',
        name: 'Slot 1',
        imageUrl: 'https://example.test/slot-1.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
      { id: 'slot-2', name: 'Slot 2', projectId: 'project-alpha' } as ImageStudioSlotRecord,
    ];
    saveImageStudioAnalysisPlanSnapshot(
      'project-alpha',
      createSnapshot('slot-2', 'signature_slot_2_old')
    );
    render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply To Auto Scaler' }));

    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(mocks.setSelectedSlotId).not.toHaveBeenCalled();
    expect(mocks.setWorkingSlotId).not.toHaveBeenCalled();
    expect(mocks.switchToControls).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.',
      {
        variant: 'info',
      }
    );
  });

  it('blocks apply when analyzed slot signature is stale', async () => {
    mocks.slotState.slots = [
      {
        id: 'slot-1',
        name: 'Slot 1',
        imageUrl: 'https://example.test/slot-1.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
      {
        id: 'slot-2',
        name: 'Slot 2',
        imageUrl: 'https://example.test/slot-2-latest.png',
        projectId: 'project-alpha',
      } as ImageStudioSlotRecord,
    ];
    saveImageStudioAnalysisPlanSnapshot('project-alpha', {
      ...createSnapshot('slot-2'),
      sourceSignature: 'signature_slot_2_old',
    });

    render(<ImageStudioAnalysisTab />);

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-slot')).toHaveTextContent('slot-2');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply To Auto Scaler' }));

    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(mocks.setSelectedSlotId).not.toHaveBeenCalled();
    expect(mocks.setWorkingSlotId).not.toHaveBeenCalled();
    expect(mocks.switchToControls).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Analysis plan is stale for this slot image. Run analysis again.',
      {
        variant: 'info',
      }
    );
  });
});
