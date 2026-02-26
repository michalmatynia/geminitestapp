import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnalysisResultSection } from '../AnalysisResultSection';
import type { ImageStudioAnalysisPlanSnapshot } from '../../../../utils/analysis-bridge';

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
}));

vi.mock('@/features/ai/image-studio/components/ImageStudioAnalysisSummaryChip', () => ({
  ImageStudioAnalysisSummaryChip: ({ label }: { label: string }): React.JSX.Element => (
    <div>{label}</div>
  ),
}));

const createSnapshot = (slotId: string): ImageStudioAnalysisPlanSnapshot => ({
  version: 1,
  slotId,
  sourceSignature: `signature_${slotId}`,
  savedAt: '2026-02-26T10:00:00.000Z',
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
  effectiveMode: 'server_analysis_v1',
  authoritativeSource: 'source_slot',
  detectionUsed: 'alpha_bbox',
  confidence: 0.93,
  policyVersion: 'policy_v2',
  policyReason: 'alpha_confident',
  fallbackApplied: false,
});

describe('AnalysisResultSection apply routing UX', () => {
  it('shows auto-switch note when analyzed slot differs from current working slot', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={createSnapshot('slot-2')}
        currentWorkingSlotId='slot-1'
        availableSlots={[
          { id: 'slot-1', label: 'Current Slot' },
          { id: 'slot-2', label: 'Analyzed Slot' },
        ]}
        slotSelectionLocked={false}
        analysisSourceSignatureMissing={false}
        analysisCurrentSourceMetadataMissing={false}
        analysisPlanIsStale={false}
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByText('Apply will switch to analyzed slot: Analyzed Slot.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeEnabled();
  });

  it('disables apply actions and shows warning when analyzed slot is missing', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={createSnapshot('slot-missing')}
        currentWorkingSlotId='slot-1'
        availableSlots={[{ id: 'slot-1', label: 'Current Slot' }]}
        slotSelectionLocked={false}
        analysisSourceSignatureMissing={false}
        analysisCurrentSourceMetadataMissing={false}
        analysisPlanIsStale={false}
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply To Auto Scaler' })).toBeDisabled();
    expect(screen.getByText('Analyzed slot no longer exists. Re-run analysis on an available slot.')).toBeInTheDocument();
  });

  it('disables apply actions and shows lock warning when slot selection is locked', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={createSnapshot('slot-1')}
        currentWorkingSlotId='slot-1'
        availableSlots={[{ id: 'slot-1', label: 'Current Slot' }]}
        slotSelectionLocked
        analysisSourceSignatureMissing={false}
        analysisCurrentSourceMetadataMissing={false}
        analysisPlanIsStale={false}
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply To Auto Scaler' })).toBeDisabled();
    expect(
      screen.getByText('Slot selection is currently locked by sequencing. Unlock it before applying this plan.')
    ).toBeInTheDocument();
  });

  it('disables apply actions and shows stale warning when analysis plan is stale', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={createSnapshot('slot-1')}
        currentWorkingSlotId='slot-1'
        availableSlots={[{ id: 'slot-1', label: 'Current Slot' }]}
        slotSelectionLocked={false}
        analysisSourceSignatureMissing={false}
        analysisCurrentSourceMetadataMissing={false}
        analysisPlanIsStale
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply To Auto Scaler' })).toBeDisabled();
    expect(
      screen.getByText('Analyzed slot image has changed since this plan was created. Run analysis again.')
    ).toBeInTheDocument();
  });

  it('disables apply actions and shows warning when source signature metadata is missing', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={{
          ...createSnapshot('slot-1'),
          sourceSignature: '',
        }}
        currentWorkingSlotId='slot-1'
        availableSlots={[{ id: 'slot-1', label: 'Current Slot' }]}
        slotSelectionLocked={false}
        analysisSourceSignatureMissing
        analysisCurrentSourceMetadataMissing={false}
        analysisPlanIsStale={false}
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply To Auto Scaler' })).toBeDisabled();
    expect(
      screen.getByText('Analysis plan source metadata is missing. Run analysis again.')
    ).toBeInTheDocument();
  });

  it('disables apply actions and shows warning when analyzed slot source metadata is missing', () => {
    render(
      <AnalysisResultSection
        result={null}
        resultSourceSlotId=''
        persistedPlanSnapshot={createSnapshot('slot-1')}
        currentWorkingSlotId='slot-1'
        availableSlots={[{ id: 'slot-1', label: 'Current Slot' }]}
        slotSelectionLocked={false}
        analysisSourceSignatureMissing={false}
        analysisCurrentSourceMetadataMissing
        analysisPlanIsStale={false}
        queueAnalysisApplyIntent={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Apply To Object Layout' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply To Auto Scaler' })).toBeDisabled();
    expect(
      screen.getByText('Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.')
    ).toBeInTheDocument();
  });
});
