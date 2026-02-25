'use client';

import { createContext, useContext } from 'react';

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
  if (!context) throw new Error('useDocumentMetrics must be used within DocumentProvider');
  return context;
}
