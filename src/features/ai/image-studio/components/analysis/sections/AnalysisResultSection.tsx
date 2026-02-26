'use client';

import React from 'react';
import { Button, Card } from '@/shared/ui';
import { ImageStudioAnalysisSummaryChip } from '../../ImageStudioAnalysisSummaryChip';
import type { AnalysisResult } from '../analysis-types';
import type { ImageStudioAnalysisPlanSnapshot } from '../../../utils/analysis-bridge';

export interface AnalysisResultSectionProps {
  result: AnalysisResult | null;
  resultSourceSlotId: string;
  persistedPlanSnapshot: ImageStudioAnalysisPlanSnapshot | null;
  currentWorkingSlotId: string;
  availableSlots: Array<{ id: string; label?: string }>;
  slotSelectionLocked: boolean;
  analysisSourceSignatureMissing: boolean;
  analysisCurrentSourceMetadataMissing: boolean;
  analysisPlanIsStale: boolean;
  queueAnalysisApplyIntent: (target: 'object_layout' | 'auto_scaler', options?: { runAfterApply?: boolean }) => void;
}

export function AnalysisResultSection({
  result,
  resultSourceSlotId,
  persistedPlanSnapshot,
  currentWorkingSlotId,
  availableSlots,
  slotSelectionLocked,
  analysisSourceSignatureMissing,
  analysisCurrentSourceMetadataMissing,
  analysisPlanIsStale,
  queueAnalysisApplyIntent,
}: AnalysisResultSectionProps): React.JSX.Element {
  const resolvedSourceSlotId =
    resultSourceSlotId.trim() || persistedPlanSnapshot?.slotId?.trim() || '';
  const normalizedWorkingSlotId = currentWorkingSlotId.trim();
  const availableSourceSlot = availableSlots.find(
    (slot) => slot.id.trim() === resolvedSourceSlotId
  );
  const sourceSlotExists = Boolean(availableSourceSlot);
  const sourceSlotLabel =
    availableSourceSlot?.label?.trim() || resolvedSourceSlotId;
  const applyDisabledReason = !resolvedSourceSlotId
    ? 'Analysis slot context is missing. Run analysis first.'
    : slotSelectionLocked
      ? 'Slot selection is currently locked by sequencing.'
      : analysisSourceSignatureMissing
        ? 'Analysis plan source metadata is missing. Run analysis again.'
        : analysisCurrentSourceMetadataMissing
          ? 'Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.'
          : analysisPlanIsStale
            ? 'Analysis plan is stale for the current analyzed slot image.'
            : !sourceSlotExists
              ? 'Analyzed slot no longer exists.'
              : null;
  const applyActions = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={() => {
          queueAnalysisApplyIntent('object_layout');
        }}
        disabled={Boolean(applyDisabledReason)}
        title={applyDisabledReason ?? 'Apply analysis plan to Object Layout controls'}
      >
        Apply To Object Layout
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={() => {
          queueAnalysisApplyIntent('auto_scaler');
        }}
        disabled={Boolean(applyDisabledReason)}
        title={applyDisabledReason ?? 'Apply analysis plan to Auto Scaler controls'}
      >
        Apply To Auto Scaler
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={() => {
          queueAnalysisApplyIntent('object_layout', { runAfterApply: true });
        }}
        disabled={Boolean(applyDisabledReason)}
        title={applyDisabledReason ?? 'Apply analysis plan and run Object Layout'}
      >
        Apply + Run Object Layout
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={() => {
          queueAnalysisApplyIntent('auto_scaler', { runAfterApply: true });
        }}
        disabled={Boolean(applyDisabledReason)}
        title={applyDisabledReason ?? 'Apply analysis plan and run Auto Scaler'}
      >
        Apply + Run Auto Scaler
      </Button>
      <span className='text-[10px] text-gray-500'>
        Applies this analysis plan to Studio controls; optional run executes automatically after apply.
      </span>
    </div>
  );
  const routingNotice =
    resolvedSourceSlotId &&
    sourceSlotExists &&
    normalizedWorkingSlotId &&
    resolvedSourceSlotId !== normalizedWorkingSlotId
      ? `Apply will switch to analyzed slot: ${sourceSlotLabel}.`
      : null;

  return (
    <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
      {result ? (
        <div className='space-y-3 text-xs text-gray-200'>
          <ImageStudioAnalysisSummaryChip
            data={{
              detectionUsed: result.detectionUsed,
              confidence: result.confidence,
              fallbackApplied: result.fallbackApplied,
              policyReason: result.policyReason,
              policyVersion: result.policyVersion,
            }}
            label='Analysis Summary'
          />
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-8'>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Detection</div>
              <div>{result.detectionUsed}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Confidence</div>
              <div>{(result.confidence * 100).toFixed(2)}%</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Shadow Policy</div>
              <div>{result.detectionDetails?.shadowPolicyApplied ?? result.layout.shadowPolicy}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Object Area</div>
              <div>{result.objectAreaPercent.toFixed(4)}%</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Policy</div>
              <div>{result.policyVersion}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Decision</div>
              <div>{result.policyReason}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Fallback</div>
              <div>{result.fallbackApplied ? 'yes' : 'no'}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Output Canvas</div>
              <div>{result.suggestedPlan.outputWidth}x{result.suggestedPlan.outputHeight}</div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Suggested Scale</div>
              <div>{result.suggestedPlan.scale.toFixed(6)}</div>
            </Card>
          </div>

          {applyActions}
          {routingNotice ? (
            <div className='text-[11px] text-sky-200'>
              {routingNotice}
            </div>
          ) : null}
          {slotSelectionLocked ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Slot selection is currently locked by sequencing. Unlock it before applying this plan.
            </Card>
          ) : null}
          {analysisSourceSignatureMissing ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analysis plan source metadata is missing. Run analysis again.
            </Card>
          ) : null}
          {analysisCurrentSourceMetadataMissing ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.
            </Card>
          ) : null}
          {analysisPlanIsStale ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot image has changed since this plan was created. Run analysis again.
            </Card>
          ) : null}
          {resolvedSourceSlotId && !sourceSlotExists ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot no longer exists. Re-run analysis on an available slot.
            </Card>
          ) : null}

          {result.fallbackApplied || result.confidence < 0.35 ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Detection confidence is low or fallback arbitration was applied. Adjust detection mode or thresholds and rerun analysis.
            </Card>
          ) : null}

          {result.detectionDetails ? (
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30 text-[11px] text-gray-300'>
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Detection Details</div>
              <div>
                components: {result.detectionDetails.componentCount} | core components: {result.detectionDetails.coreComponentCount} | mask: {result.detectionDetails.maskSource}
              </div>
              <div>
                selected coverage: {(result.detectionDetails.selectedComponentCoverage * 100).toFixed(2)}% | border touch: {result.detectionDetails.touchesBorder ? 'yes' : 'no'}
              </div>
              <div>
                candidates: alpha {result.candidateDetections.alpha_bbox
                  ? `${(result.candidateDetections.alpha_bbox.confidence * 100).toFixed(2)}% / area ${result.candidateDetections.alpha_bbox.area}`
                  : 'n/a'} | white {result.candidateDetections.white_bg_first_colored_pixel
                  ? `${(result.candidateDetections.white_bg_first_colored_pixel.confidence * 100).toFixed(2)}% / area ${result.candidateDetections.white_bg_first_colored_pixel.area}`
                  : 'n/a'}
              </div>
            </Card>
          ) : null}

          <div className='grid gap-2 sm:grid-cols-2'>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Source Object Bounds</div>
              <div>
                x: {result.sourceObjectBounds.left}, y: {result.sourceObjectBounds.top}, w: {result.sourceObjectBounds.width}, h: {result.sourceObjectBounds.height}
              </div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Target Object Bounds</div>
              <div>
                x: {result.suggestedPlan.targetObjectBounds.left}, y: {result.suggestedPlan.targetObjectBounds.top}, w: {result.suggestedPlan.targetObjectBounds.width}, h: {result.suggestedPlan.targetObjectBounds.height}
              </div>
            </Card>
          </div>

          <div className='grid gap-2 sm:grid-cols-2'>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace Before (%)</div>
              <div>
                L {result.whitespace.percent.left.toFixed(3)} | R {result.whitespace.percent.right.toFixed(3)} | T {result.whitespace.percent.top.toFixed(3)} | B {result.whitespace.percent.bottom.toFixed(3)}
              </div>
            </Card>
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace After (%)</div>
              <div>
                L {result.suggestedPlan.whitespace.percent.left.toFixed(3)} | R {result.suggestedPlan.whitespace.percent.right.toFixed(3)} | T {result.suggestedPlan.whitespace.percent.top.toFixed(3)} | B {result.suggestedPlan.whitespace.percent.bottom.toFixed(3)}
              </div>
            </Card>
          </div>
        </div>
      ) : persistedPlanSnapshot ? (
        <div className='space-y-3 text-xs text-gray-200'>
          <ImageStudioAnalysisSummaryChip
            data={{
              detectionUsed: persistedPlanSnapshot.detectionUsed,
              confidence: persistedPlanSnapshot.confidence,
              fallbackApplied: persistedPlanSnapshot.fallbackApplied,
              policyReason: persistedPlanSnapshot.policyReason,
              policyVersion: persistedPlanSnapshot.policyVersion,
            }}
            label='Retained Analysis Summary'
          />
          {applyActions}
          {routingNotice ? (
            <div className='text-[11px] text-sky-200'>
              {routingNotice}
            </div>
          ) : null}
          {slotSelectionLocked ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Slot selection is currently locked by sequencing. Unlock it before applying this plan.
            </Card>
          ) : null}
          {analysisSourceSignatureMissing ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analysis plan source metadata is missing. Run analysis again.
            </Card>
          ) : null}
          {analysisCurrentSourceMetadataMissing ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.
            </Card>
          ) : null}
          {analysisPlanIsStale ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot image has changed since this plan was created. Run analysis again.
            </Card>
          ) : null}
          {resolvedSourceSlotId && !sourceSlotExists ? (
            <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
              Analyzed slot no longer exists. Re-run analysis on an available slot.
            </Card>
          ) : null}
          <div className='text-[11px] text-gray-500'>
            Retained summary loaded from saved analysis plan. Run analysis again to view full metrics.
          </div>
        </div>
      ) : (
        <div className='text-xs text-gray-500'>
          Run analysis to inspect detected object bounds, whitespace metrics, and suggested auto-scaler fit plan.
        </div>
      )}
    </Card>
  );
}
