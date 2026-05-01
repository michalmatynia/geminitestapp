import { useCallback, useState } from 'react';

type ProductScanRowExpansionState = {
  expandedRowIds: Set<string>;
  expandedDiagnosticRowIds: Set<string>;
  expandedExtractedFieldRowIds: Set<string>;
  resetRowExpansion: () => void;
  toggleRowDiagnostics: (productId: string) => void;
  toggleRowExtractedFields: (productId: string) => void;
  toggleRowSteps: (productId: string) => void;
};

const toggleSetValue = (current: Set<string>, value: string): Set<string> => {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
    return next;
  }
  next.add(value);
  return next;
};

export const useProductScanRowExpansionState = (): ProductScanRowExpansionState => {
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [expandedDiagnosticRowIds, setExpandedDiagnosticRowIds] = useState<Set<string>>(new Set());
  const [expandedExtractedFieldRowIds, setExpandedExtractedFieldRowIds] = useState<Set<string>>(
    new Set()
  );

  const resetRowExpansion = useCallback((): void => {
    setExpandedRowIds(new Set());
    setExpandedDiagnosticRowIds(new Set());
    setExpandedExtractedFieldRowIds(new Set());
  }, []);

  const toggleRowSteps = useCallback((productId: string): void => {
    setExpandedRowIds((current) => toggleSetValue(current, productId));
  }, []);

  const toggleRowDiagnostics = useCallback((productId: string): void => {
    setExpandedDiagnosticRowIds((current) => toggleSetValue(current, productId));
  }, []);

  const toggleRowExtractedFields = useCallback((productId: string): void => {
    setExpandedExtractedFieldRowIds((current) => toggleSetValue(current, productId));
  }, []);

  return {
    expandedRowIds,
    expandedDiagnosticRowIds,
    expandedExtractedFieldRowIds,
    resetRowExpansion,
    toggleRowDiagnostics,
    toggleRowExtractedFields,
    toggleRowSteps,
  };
};
