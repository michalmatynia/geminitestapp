'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

export interface DocumentMetricsState {
  explosionMetrics: {
    total: number;
    avgConfidence: number;
    lowConfidenceThreshold: number;
    lowConfidenceCount: number;
    typedCoverage: number;
    typeCounts: Record<string, number>;
  } | null;
}

export const DocumentMetricsContext = createContext<DocumentMetricsState | null>(null);

export function useDocumentMetrics(): DocumentMetricsState {
  const context = useContext(DocumentMetricsContext);
  if (!context) throw internalError('useDocumentMetrics must be used within DocumentProvider');
  return context;
}
