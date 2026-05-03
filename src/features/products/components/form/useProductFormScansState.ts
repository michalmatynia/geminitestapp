'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductScanProvider } from '@/shared/contracts/product-scans';

export type ProductFormScansState = {
  scanModalProvider: Extract<ProductScanProvider, 'amazon' | '1688'> | null;
  setScanModalProvider: React.Dispatch<React.SetStateAction<Extract<ProductScanProvider, 'amazon' | '1688'> | null>>;
  expandedScanIds: Set<string>;
  expandedDiagnosticScanIds: Set<string>;
  expandedExtractedFieldScanIds: Set<string>;
  toggleScanSteps: (scanId: string) => void;
  toggleDiagnostics: (scanId: string) => void;
  toggleExtractedFields: (scanId: string) => void;
};

export function useProductFormScansState(productId: string): ProductFormScansState {
  const [scanModalProvider, setScanModalProvider] = useState<
    Extract<ProductScanProvider, 'amazon' | '1688'> | null
  >(null);
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [expandedDiagnosticScanIds, setExpandedDiagnosticScanIds] = useState<Set<string>>(new Set());
  const [expandedExtractedFieldScanIds, setExpandedExtractedFieldScanIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setExpandedScanIds(new Set());
    setExpandedDiagnosticScanIds(new Set());
    setExpandedExtractedFieldScanIds(new Set());
  }, [productId]);

  const toggleSet = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string): void => {
    set((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleScanSteps = useCallback((id: string): void => toggleSet(setExpandedScanIds, id), []);
  const toggleDiagnostics = useCallback((id: string): void => toggleSet(setExpandedDiagnosticScanIds, id), []);
  const toggleExtractedFields = useCallback((id: string): void => toggleSet(setExpandedExtractedFieldScanIds, id), []);

  return {
    scanModalProvider,
    setScanModalProvider,
    expandedScanIds,
    expandedDiagnosticScanIds,
    expandedExtractedFieldScanIds,
    toggleScanSteps,
    toggleDiagnostics,
    toggleExtractedFields,
  };
}
