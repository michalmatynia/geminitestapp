'use client';

import React from 'react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';

import { ProductScanAmazonAiChainSection } from './ProductScanAmazonAiChainSection';
import { ProductScanDiagnosticsBadges } from './ProductScanDiagnosticsBadges';
import { ProductScanDiagnosticsRecordedSection } from './ProductScanDiagnosticsRecordedSection';
import {
  ProductScanDiagnosticLinks,
  ProductScanEvaluationPolicySection,
  ProductScanLogTailSection,
  ProductScanRuntimePostureSection,
} from './ProductScanDiagnosticsSections';
import { ProductScanFailureArtifactsSection } from './ProductScanFailureArtifactsSection';
import {
  isAmazonRecordedDiagnosticsResponse,
} from './ProductScanDiagnostics.normalize';
import {
  buildProductScanArtifactHref,
  buildProductScanRecordedDiagnosticArtifactHref,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
} from './ProductScanDiagnostics.resolve';
import type {
  ProductScanDiagnosticFailureSummary,
  RecordedDiagnosticResponse,
  ScanDiagnostics,
} from './ProductScanDiagnostics.types';
import { resolveProductScanEvaluationPolicySummary } from './ProductScanSteps';

export {
  buildProductScanArtifactHref,
  buildProductScanRecordedDiagnosticArtifactHref,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
};
export type { ProductScanDiagnosticFailureSummary };

type ProductScanDiagnosticsProps = {
  scan: Pick<ProductScanRecord, 'id' | 'rawResult' | 'steps'> &
    Partial<Pick<ProductScanRecord, 'provider'>>;
};

type RecordedDiagnosticsStatus = 'idle' | 'loading' | 'loaded' | 'error';

type RecordedDiagnosticsState = {
  recordedDiagnostics: RecordedDiagnosticResponse | null;
  recordedDiagnosticsStatus: RecordedDiagnosticsStatus;
};

const buildRecordedDiagnosticsEndpoint = (scanId: string): string =>
  `/api/v2/products/scans/${encodeURIComponent(scanId)}/diagnostics`;

const shouldLoadRecordedDiagnostics = (scan: ProductScanDiagnosticsProps['scan']): boolean =>
  scan.provider === 'amazon' && scan.id.trim().length > 0;

const hasRenderableDiagnostics = (input: {
  diagnostics: ScanDiagnostics | null;
  recordedDiagnosticsStatus: RecordedDiagnosticsStatus;
  recordedDiagnostics: RecordedDiagnosticResponse | null;
}): boolean =>
  input.diagnostics !== null ||
  input.recordedDiagnostics?.classification !== undefined ||
  (input.recordedDiagnostics?.artifacts.length ?? 0) > 0 ||
  input.recordedDiagnosticsStatus === 'loading';

const useRecordedDiagnostics = (
  scan: ProductScanDiagnosticsProps['scan']
): RecordedDiagnosticsState => {
  const shouldLoad = shouldLoadRecordedDiagnostics(scan);
  const [recordedDiagnostics, setRecordedDiagnostics] =
    React.useState<RecordedDiagnosticResponse | null>(null);
  const [recordedDiagnosticsStatus, setRecordedDiagnosticsStatus] =
    React.useState<RecordedDiagnosticsStatus>(shouldLoad ? 'loading' : 'idle');

  React.useEffect(() => {
    const abortController = new AbortController();
    if (shouldLoad === false) {
      setRecordedDiagnostics(null);
      setRecordedDiagnosticsStatus('idle');
      return () => abortController.abort();
    }

    setRecordedDiagnosticsStatus('loading');
    void api
      .get<RecordedDiagnosticResponse>(buildRecordedDiagnosticsEndpoint(scan.id), {
        cache: 'no-store',
        signal: abortController.signal,
      })
      .then((response) => {
        if (isAmazonRecordedDiagnosticsResponse(response) === false) {
          setRecordedDiagnostics(null);
          setRecordedDiagnosticsStatus('error');
          return;
        }
        setRecordedDiagnostics(response);
        setRecordedDiagnosticsStatus('loaded');
      })
      .catch(() => {
        if (abortController.signal.aborted === true) return;
        setRecordedDiagnostics(null);
        setRecordedDiagnosticsStatus('error');
      });

    return () => abortController.abort();
  }, [scan.id, shouldLoad]);

  return { recordedDiagnostics, recordedDiagnosticsStatus };
};

export function ProductScanDiagnostics(
  props: ProductScanDiagnosticsProps
): React.JSX.Element | null {
  const diagnostics = resolveProductScanDiagnostics(props.scan);
  const evaluationPolicySummary = resolveProductScanEvaluationPolicySummary(props.scan.steps);
  const { recordedDiagnostics, recordedDiagnosticsStatus } = useRecordedDiagnostics(props.scan);
  const recordedArtifacts = recordedDiagnostics?.artifacts ?? [];
  const recordedClassification = recordedDiagnostics?.classification ?? null;

  if (
    hasRenderableDiagnostics({
      diagnostics,
      recordedDiagnostics,
      recordedDiagnosticsStatus,
    }) === false
  ) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <ProductScanDiagnosticsBadges
        diagnostics={diagnostics}
        recordedArtifactCount={recordedArtifacts.length}
        recordedClassification={recordedClassification}
        recordedDiagnosticsStatus={recordedDiagnosticsStatus}
      />
      <ProductScanDiagnosticsRecordedSection
        artifacts={recordedArtifacts}
        classification={recordedClassification}
        scanId={props.scan.id}
      />
      {diagnostics !== null ? (
        <>
          <ProductScanDiagnosticLinks diagnostics={diagnostics} />
          <ProductScanRuntimePostureSection runtimePosture={diagnostics.runtimePosture} />
          <ProductScanEvaluationPolicySection
            evaluationPolicySummary={evaluationPolicySummary}
          />
          <ProductScanAmazonAiChainSection stages={diagnostics.amazonAiStages} />
          <ProductScanFailureArtifactsSection
            artifacts={diagnostics.failureArtifacts}
            scanId={props.scan.id}
          />
          <ProductScanLogTailSection logTail={diagnostics.logTail} />
        </>
      ) : null}
    </div>
  );
}
