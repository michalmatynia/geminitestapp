import { useState, type Dispatch, type SetStateAction } from 'react';

import { useProductScan1688ReviewState } from '@/features/products/components/scans/useProductScan1688ReviewState';

import { useProductScanRowExpansionState } from './ProductScanModal.row-expansion';
import type { ScanModalRow } from './ProductScanModal.types';

type ProductScanModalState = ReturnType<typeof useProductScan1688ReviewState> &
  ReturnType<typeof useProductScanRowExpansionState> & {
    amazonImageSearchPageDraftUrl: string;
    amazonImageSearchPageUrl: string;
    amazonSelectorProfile: string;
    extractingCandidateUrlsByProductId: Record<string, string | null>;
    isPolling: boolean;
    isSubmitting: boolean;
    rows: ScanModalRow[];
    setAmazonImageSearchPageDraftUrl: Dispatch<SetStateAction<string>>;
    setAmazonImageSearchPageUrl: Dispatch<SetStateAction<string>>;
    setAmazonSelectorProfile: Dispatch<SetStateAction<string>>;
    setExtractingCandidateUrlsByProductId: Dispatch<
      SetStateAction<Record<string, string | null>>
    >;
    setIsPolling: Dispatch<SetStateAction<boolean>>;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
    setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
  };

export const useProductScanModalState = (): ProductScanModalState => {
  const [rows, setRows] = useState<ScanModalRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [amazonSelectorProfile, setAmazonSelectorProfile] = useState('amazon');
  const [amazonImageSearchPageUrl, setAmazonImageSearchPageUrl] = useState('');
  const [amazonImageSearchPageDraftUrl, setAmazonImageSearchPageDraftUrl] = useState('');
  const [extractingCandidateUrlsByProductId, setExtractingCandidateUrlsByProductId] = useState<
    Record<string, string | null>
  >({});
  const rowExpansion = useProductScanRowExpansionState();
  const reviewState = useProductScan1688ReviewState();

  return {
    ...rowExpansion,
    ...reviewState,
    amazonImageSearchPageDraftUrl,
    amazonImageSearchPageUrl,
    amazonSelectorProfile,
    extractingCandidateUrlsByProductId,
    isPolling,
    isSubmitting,
    rows,
    setAmazonImageSearchPageDraftUrl,
    setAmazonImageSearchPageUrl,
    setAmazonSelectorProfile,
    setExtractingCandidateUrlsByProductId,
    setIsPolling,
    setIsSubmitting,
    setRows,
  };
};
