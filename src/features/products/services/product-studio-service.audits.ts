import { createProductStudioRunAudit } from '@/features/products/services/product-studio-audit-service';
import {
  type ProductStudioExecutionRoute,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingDiagnostics,
} from '@/shared/contracts/products';
import { type ImageStudioRunDispatchMode } from '@/features/jobs/workers/imageStudioRunQueue';

export const buildAuditSettingsContext = (
  sequencingDiagnostics: ProductStudioSequencingDiagnostics
): {
  settingsScope: 'project' | 'global' | 'default';
  settingsKey: string | null;
  projectSettingsKey: string | null;
  settingsScopeValid: boolean;
} => ({
  settingsScope: sequencingDiagnostics.selectedScope,
  settingsKey: sequencingDiagnostics.selectedSettingsKey,
  projectSettingsKey: sequencingDiagnostics.projectSettingsKey,
  settingsScopeValid: sequencingDiagnostics.selectedScope === 'project',
});

export const logProductStudioRunAudit = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId: string;
  status: 'completed' | 'failed';
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  runKind: 'generation' | 'sequence';
  runId: string | null;
  sequenceRunId: string | null;
  dispatchMode: ImageStudioRunDispatchMode | null;
  fallbackReason: string | null;
  warnings: string[];
  auditSettingsContext: ReturnType<typeof buildAuditSettingsContext>;
  sequenceSnapshotHash: string | null;
  stepOrderUsed: string[];
  resolvedCropRect: { x: number; y: number; width: number; height: number } | null;
  sourceImageSize: { width: number; height: number } | null;
  timings: {
    importMs: number;
    sourceSlotUpsertMs: number;
    routeDecisionMs: number;
    dispatchMs: number;
    totalMs: number;
  };
  errorMessage: string | null;
}): Promise<void> => {
  await createProductStudioRunAudit({
    productId: params.productId,
    imageSlotIndex: params.imageSlotIndex,
    projectId: params.projectId,
    status: params.status,
    requestedSequenceMode: params.requestedSequenceMode,
    resolvedSequenceMode: params.resolvedSequenceMode,
    executionRoute: params.executionRoute,
    runKind: params.runKind,
    runId: params.runId,
    sequenceRunId: params.sequenceRunId,
    dispatchMode: params.dispatchMode,
    fallbackReason: params.fallbackReason,
    warnings: params.warnings,
    ...params.auditSettingsContext,
    sequenceSnapshotHash: params.sequenceSnapshotHash,
    stepOrderUsed: params.stepOrderUsed,
    resolvedCropRect: params.resolvedCropRect,
    sourceImageSize: params.sourceImageSize,
    timings: params.timings,
    errorMessage: params.errorMessage,
  }).catch(() => {});
};
