import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationToolbarAutoScalerSection } from '../GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from '../GenerationToolbarCenterSection';

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

describe('GenerationToolbar analysis integration section UX', () => {
  beforeEach(() => {
    Object.values(mockToolbarContext).forEach((entry) => {
      if (typeof entry === 'function' && 'mockClear' in entry) {
        (entry as { mockClear: () => void }).mockClear();
      }
    });
  });

  it('disables Center "Use Analysis Plan" when the plan is stale', () => {
    render(
      <GenerationToolbarCenterSection
        analysisPlanAvailable
        analysisPlanIsStale
        analysisPlanSlotMissing={false}
        analysisPlanWillSwitchSlot={false}
        analysisPlanSwitchSlotLabel=''
        slotSelectionLocked={false}
        analysisSummaryData={null}
        analysisSummaryIsStale
        analysisConfigMismatchMessage={null}
        centerBusyLabel='Center'
        centerGuidesEnabled={false}
        centerLayoutEnabled
        centerLayoutPreset='default:auto'
        centerLayoutPresetOptions={[{ value: 'default:auto', label: 'Default' }]}
        centerLayoutCanDeletePreset={false}
        centerLayoutCanSavePreset={false}
        centerLayoutSavePresetLabel='Save'
        centerLayoutDetectionOptions={[{ value: 'auto', label: 'Auto' }]}
        centerLayoutProjectCanvasSize={null}
        centerLayoutShadowPolicyOptions={[{ value: 'auto', label: 'Auto' }]}
        centerTooltipContent={{
          apply: 'Apply',
          detection: 'Detection',
          fillMissingCanvasWhite: 'Fill',
          mode: 'Mode',
          padding: 'Padding',
          paddingAxes: 'Axes',
          shadowPolicy: 'Shadow',
          thresholds: 'Thresholds',
        }}
        centerTooltipsEnabled={false}
        centerModeOptions={[{ value: 'server_object_layout_v1', label: 'Layout Server' }]}
        hasSourceImage
        onCancelCenter={vi.fn()}
        onCenterLayoutPresetChange={vi.fn()}
        onCenterLayoutSavePreset={vi.fn()}
        onCenterLayoutDeletePreset={vi.fn()}
        onApplyAnalysisPlan={vi.fn()}
        onCenterObject={vi.fn()}
        onToggleCenterLayoutAdvanced={vi.fn()}
        onToggleCenterLayoutSplitAxes={vi.fn()}
        onToggleCenterGuides={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Use Analysis Plan' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Latest analysis plan is stale for the current slot image');
  });

  it('disables Auto Scaler "Use Analysis Plan" when the plan is stale', () => {
    render(
      <GenerationToolbarAutoScalerSection
        analysisPlanAvailable
        analysisPlanIsStale
        analysisPlanSlotMissing={false}
        analysisPlanWillSwitchSlot={false}
        analysisPlanSwitchSlotLabel=''
        slotSelectionLocked={false}
        analysisSummaryData={null}
        analysisSummaryIsStale
        analysisConfigMismatchMessage={null}
        autoScaleBusyLabel='Auto Scale'
        autoScaleLayoutProjectCanvasSize={null}
        autoScaleShadowPolicyOptions={[{ value: 'auto', label: 'Auto' }]}
        autoScaleTooltipContent={{
          apply: 'Apply',
          fillMissingCanvasWhite: 'Fill',
          mode: 'Mode',
          padding: 'Padding',
          paddingAxes: 'Axes',
          shadowPolicy: 'Shadow',
        }}
        autoScaleTooltipsEnabled={false}
        autoScaleModeOptions={[{ value: 'server_auto_scaler_v1', label: 'Server' }]}
        hasSourceImage
        onAutoScale={vi.fn()}
        onApplyAnalysisPlan={vi.fn()}
        onCancelAutoScale={vi.fn()}
        onOpenSharedDetectionSettings={vi.fn()}
        onToggleAutoScaleLayoutSplitAxes={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Use Analysis Plan' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Latest analysis plan is stale for the current slot image');
  });

  it('renders mismatch message and invokes shared detection deep-link action', () => {
    const onOpenSharedDetectionSettings = vi.fn();

    render(
      <GenerationToolbarAutoScalerSection
        analysisPlanAvailable
        analysisPlanIsStale={false}
        analysisPlanSlotMissing={false}
        analysisPlanWillSwitchSlot={false}
        analysisPlanSwitchSlotLabel=''
        slotSelectionLocked={false}
        analysisSummaryData={null}
        analysisSummaryIsStale={false}
        analysisConfigMismatchMessage='Current controls differ from analysis plan: padding, detection.'
        autoScaleBusyLabel='Auto Scale'
        autoScaleLayoutProjectCanvasSize={null}
        autoScaleShadowPolicyOptions={[{ value: 'auto', label: 'Auto' }]}
        autoScaleTooltipContent={{
          apply: 'Apply',
          fillMissingCanvasWhite: 'Fill',
          mode: 'Mode',
          padding: 'Padding',
          paddingAxes: 'Axes',
          shadowPolicy: 'Shadow',
        }}
        autoScaleTooltipsEnabled={false}
        autoScaleModeOptions={[{ value: 'server_auto_scaler_v1', label: 'Server' }]}
        hasSourceImage
        onAutoScale={vi.fn()}
        onApplyAnalysisPlan={vi.fn()}
        onCancelAutoScale={vi.fn()}
        onOpenSharedDetectionSettings={onOpenSharedDetectionSettings}
        onToggleAutoScaleLayoutSplitAxes={vi.fn()}
      />
    );

    expect(
      screen.getByText('Current controls differ from analysis plan: padding, detection.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Shared Detection Settings' }));
    expect(onOpenSharedDetectionSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps Use Analysis Plan enabled on slot mismatch and shows switch note', () => {
    render(
      <GenerationToolbarCenterSection
        analysisPlanAvailable
        analysisPlanIsStale={false}
        analysisPlanSlotMissing={false}
        analysisPlanWillSwitchSlot
        analysisPlanSwitchSlotLabel='Analyzed Slot'
        slotSelectionLocked={false}
        analysisSummaryData={null}
        analysisSummaryIsStale={false}
        analysisConfigMismatchMessage={null}
        centerBusyLabel='Center'
        centerGuidesEnabled={false}
        centerLayoutEnabled
        centerLayoutPreset='default:auto'
        centerLayoutPresetOptions={[{ value: 'default:auto', label: 'Default' }]}
        centerLayoutCanDeletePreset={false}
        centerLayoutCanSavePreset={false}
        centerLayoutSavePresetLabel='Save'
        centerLayoutDetectionOptions={[{ value: 'auto', label: 'Auto' }]}
        centerLayoutProjectCanvasSize={null}
        centerLayoutShadowPolicyOptions={[{ value: 'auto', label: 'Auto' }]}
        centerTooltipContent={{
          apply: 'Apply',
          detection: 'Detection',
          fillMissingCanvasWhite: 'Fill',
          mode: 'Mode',
          padding: 'Padding',
          paddingAxes: 'Axes',
          shadowPolicy: 'Shadow',
          thresholds: 'Thresholds',
        }}
        centerTooltipsEnabled={false}
        centerModeOptions={[{ value: 'server_object_layout_v1', label: 'Layout Server' }]}
        hasSourceImage
        onCancelCenter={vi.fn()}
        onCenterLayoutPresetChange={vi.fn()}
        onCenterLayoutSavePreset={vi.fn()}
        onCenterLayoutDeletePreset={vi.fn()}
        onApplyAnalysisPlan={vi.fn()}
        onCenterObject={vi.fn()}
        onToggleCenterLayoutAdvanced={vi.fn()}
        onToggleCenterLayoutSplitAxes={vi.fn()}
        onToggleCenterGuides={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Use Analysis Plan' });
    expect(button).toBeEnabled();
    expect(
      screen.getByText('Use Analysis Plan will switch to analyzed slot: Analyzed Slot.')
    ).toBeInTheDocument();
  });
});
