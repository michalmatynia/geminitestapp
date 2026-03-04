import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationToolbarAutoScalerSection } from '../GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from '../GenerationToolbarCenterSection';
import {
  GenerationToolbarAutoScalerSectionRuntimeProvider,
  GenerationToolbarCenterSectionRuntimeProvider,
} from '../GenerationToolbarSectionContexts';

const mockToolbarContext = {
  centerMode: 'server_object_layout_v1',
  setCenterMode: vi.fn(),
  centerLayoutShadowPolicy: 'auto',
  setCenterLayoutShadowPolicy: vi.fn(),
  centerLayoutPadding: '8',
  setCenterLayoutPadding: vi.fn(),
  centerLayoutSplitAxes: false,
  centerLayoutAdvancedEnabled: true,
  centerLayoutDetection: 'auto',
  setCenterLayoutDetection: vi.fn(),
  centerLayoutWhiteThreshold: '16',
  setCenterLayoutWhiteThreshold: vi.fn(),
  centerLayoutChromaThreshold: '10',
  setCenterLayoutChromaThreshold: vi.fn(),
  centerLayoutPresetDraftName: '',
  setCenterLayoutPresetDraftName: vi.fn(),
  centerLayoutPaddingX: '8',
  setCenterLayoutPaddingX: vi.fn(),
  centerLayoutPaddingY: '8',
  setCenterLayoutPaddingY: vi.fn(),
  centerLayoutFillMissingCanvasWhite: false,
  setCenterLayoutFillMissingCanvasWhite: vi.fn(),
  centerBusy: false,
  autoScaleMode: 'server_auto_scaler_v1',
  setAutoScaleMode: vi.fn(),
  autoScaleLayoutShadowPolicy: 'auto',
  setAutoScaleLayoutShadowPolicy: vi.fn(),
  autoScaleLayoutPadding: '8',
  setAutoScaleLayoutPadding: vi.fn(),
  autoScaleLayoutSplitAxes: false,
  autoScaleLayoutPaddingX: '8',
  setAutoScaleLayoutPaddingX: vi.fn(),
  autoScaleLayoutPaddingY: '8',
  setAutoScaleLayoutPaddingY: vi.fn(),
  autoScaleLayoutFillMissingCanvasWhite: false,
  setAutoScaleLayoutFillMissingCanvasWhite: vi.fn(),
  autoScaleBusy: false,
};

vi.mock('../GenerationToolbarContext', () => ({
  useGenerationToolbarContext: () => mockToolbarContext,
}));

const baseCenterRuntime = (overrides?: Record<string, unknown>) => ({
  analysisPlanAvailable: true,
  analysisPlanSourceMetadataMissing: false,
  analysisWorkingSourceMetadataMissing: false,
  analysisPlanIsStale: false,
  analysisPlanSlotMissing: false,
  analysisPlanWillSwitchSlot: false,
  analysisPlanSwitchSlotLabel: '',
  slotSelectionLocked: false,
  analysisSummaryData: null,
  analysisSummaryIsStale: false,
  analysisConfigMismatchMessage: null,
  analysisBusy: false,
  analysisBusyLabel: 'Run Analysis',
  centerBusyLabel: 'Center',
  centerGuidesEnabled: false,
  centerLayoutEnabled: true,
  centerLayoutPreset: 'default:auto',
  centerLayoutPresetOptions: [{ value: 'default:auto', label: 'Default' }],
  centerLayoutCanDeletePreset: false,
  centerLayoutCanSavePreset: false,
  centerLayoutSavePresetLabel: 'Save',
  centerLayoutDetectionOptions: [{ value: 'auto', label: 'Auto' }],
  centerLayoutProjectCanvasSize: null,
  centerLayoutShadowPolicyOptions: [{ value: 'auto', label: 'Auto' }],
  centerTooltipContent: {
    apply: 'Apply',
    detection: 'Detection',
    fillMissingCanvasWhite: 'Fill',
    mode: 'Mode',
    padding: 'Padding',
    paddingAxes: 'Axes',
    shadowPolicy: 'Shadow',
    thresholds: 'Thresholds',
  },
  centerTooltipsEnabled: false,
  centerModeOptions: [{ value: 'server_object_layout_v1', label: 'Layout Server' }],
  hasSourceImage: true,
  onCancelCenter: vi.fn(),
  onCenterLayoutPresetChange: vi.fn(),
  onCenterLayoutSavePreset: vi.fn(),
  onCenterLayoutDeletePreset: vi.fn(),
  onRunAnalysis: vi.fn(),
  onCenterObject: vi.fn(),
  onToggleCenterLayoutAdvanced: vi.fn(),
  onToggleCenterLayoutSplitAxes: vi.fn(),
  onToggleCenterGuides: vi.fn(),
  ...(overrides ?? {}),
});

const baseAutoScalerRuntime = (overrides?: Record<string, unknown>) => ({
  analysisPlanAvailable: true,
  analysisPlanSourceMetadataMissing: false,
  analysisWorkingSourceMetadataMissing: false,
  analysisPlanIsStale: false,
  analysisPlanSlotMissing: false,
  analysisPlanWillSwitchSlot: false,
  analysisPlanSwitchSlotLabel: '',
  slotSelectionLocked: false,
  analysisSummaryData: null,
  analysisSummaryIsStale: false,
  analysisConfigMismatchMessage: null,
  analysisBusy: false,
  analysisBusyLabel: 'Run Analysis',
  autoScaleBusyLabel: 'Auto Scale',
  autoScaleLayoutProjectCanvasSize: null,
  autoScaleShadowPolicyOptions: [{ value: 'auto', label: 'Auto' }],
  autoScaleTooltipContent: {
    apply: 'Apply',
    fillMissingCanvasWhite: 'Fill',
    mode: 'Mode',
    padding: 'Padding',
    paddingAxes: 'Axes',
    shadowPolicy: 'Shadow',
  },
  autoScaleTooltipsEnabled: false,
  autoScaleModeOptions: [{ value: 'server_auto_scaler_v1', label: 'Server' }],
  hasSourceImage: true,
  onAutoScale: vi.fn(),
  onRunAnalysis: vi.fn(),
  onCancelAutoScale: vi.fn(),
  onOpenSharedDetectionSettings: vi.fn(),
  onToggleAutoScaleLayoutSplitAxes: vi.fn(),
  ...(overrides ?? {}),
});

describe('GenerationToolbar analysis integration section UX', () => {
  beforeEach(() => {
    Object.values(mockToolbarContext).forEach((entry) => {
      if (typeof entry === 'function' && 'mockClear' in entry) {
        (entry as { mockClear: () => void }).mockClear();
      }
    });
  });

  const renderCenter = (overrides?: Record<string, unknown>) =>
    render(
      <GenerationToolbarCenterSectionRuntimeProvider value={baseCenterRuntime(overrides)}>
        <GenerationToolbarCenterSection />
      </GenerationToolbarCenterSectionRuntimeProvider>
    );

  const renderAutoScaler = (overrides?: Record<string, unknown>) =>
    render(
      <GenerationToolbarAutoScalerSectionRuntimeProvider value={baseAutoScalerRuntime(overrides)}>
        <GenerationToolbarAutoScalerSection />
      </GenerationToolbarAutoScalerSectionRuntimeProvider>
    );

  it('shows "Run Analysis" in both Object Layouting and Auto Scaler sections', () => {
    renderCenter();
    renderAutoScaler();

    expect(screen.getAllByRole('button', { name: 'Run Analysis' })).toHaveLength(2);
  });

  it('invokes run callbacks from both sections', () => {
    const onRunCenter = vi.fn();
    const onRunAuto = vi.fn();
    renderCenter({ onRunAnalysis: onRunCenter });
    renderAutoScaler({ onRunAnalysis: onRunAuto });

    const buttons = screen.getAllByRole('button', { name: 'Run Analysis' });
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[1]!);

    expect(onRunCenter).toHaveBeenCalledTimes(1);
    expect(onRunAuto).toHaveBeenCalledTimes(1);
  });

  it('keeps Run Analysis enabled when plan is stale and still shows stale guidance', () => {
    renderCenter({
      analysisPlanIsStale: true,
      analysisSummaryIsStale: true,
    });

    const button = screen.getByRole('button', { name: 'Run Analysis' });
    expect(button).toBeEnabled();
    expect(
      screen.getByText('Latest analysis plan is stale for the current slot image.')
    ).toBeInTheDocument();
  });

  it('disables Run Analysis when there is no source image', () => {
    renderAutoScaler({ hasSourceImage: false });
    const button = screen.getByRole('button', { name: 'Run Analysis' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Select a slot image before analysis');
  });

  it('disables Run Analysis while analysis is already running', () => {
    renderCenter({
      analysisBusy: true,
      analysisBusyLabel: 'Analyze: Processing',
    });
    const button = screen.getByRole('button', { name: 'Analyze: Processing' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Analysis is already running');
  });

  it('renders mismatch message and invokes shared detection deep-link action', () => {
    const onOpenSharedDetectionSettings = vi.fn();

    renderAutoScaler({
      analysisConfigMismatchMessage:
        'Current controls differ from analysis plan: padding, detection.',
      onOpenSharedDetectionSettings,
    });

    expect(
      screen.getByText('Current controls differ from analysis plan: padding, detection.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Shared Detection Settings' }));
    expect(onOpenSharedDetectionSettings).toHaveBeenCalledTimes(1);
  });
});
