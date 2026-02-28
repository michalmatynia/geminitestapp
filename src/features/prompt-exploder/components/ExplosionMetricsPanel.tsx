'use client';

import React from 'react';

import { FormSection } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';

export function ExplosionMetricsPanel(): React.JSX.Element {
  const { explosionMetrics } = useDocumentState();

  return (
    <FormSection
      title='Explosion Metrics'
      description='Observability metrics for current segmentation quality.'
      variant='subtle'
      className='p-4'
    >
      {!explosionMetrics ? (
        <div className='text-xs text-gray-500'>Run Prompt Exploder to generate metrics.</div>
      ) : (
        <div className='space-y-2 text-xs text-gray-300'>
          <div>
            Segments: {explosionMetrics.total} · avg confidence{' '}
            {(explosionMetrics.avgConfidence * 100).toFixed(1)}% · low confidence ({'<'}
            {explosionMetrics.lowConfidenceThreshold.toFixed(2)}):{' '}
            {explosionMetrics.lowConfidenceCount}
          </div>
          <div>Typed coverage: {(explosionMetrics.typedCoverage * 100).toFixed(1)}%</div>
          <div className='rounded border border-border/50 bg-card/20 p-2'>
            {Object.entries(explosionMetrics.typeCounts)
              .sort((left, right) => right[1] - left[1])
              .map(([type, count]) => (
                <div key={type}>
                  {type}: {count}
                </div>
              ))}
          </div>
        </div>
      )}
    </FormSection>
  );
}
