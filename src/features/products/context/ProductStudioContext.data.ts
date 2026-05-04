/**
 * Product Studio Context Data
 * 
 * Data fetching and management for product studio.
 * Provides:
 * - Studio audit data retrieval
 * - Studio variants data retrieval
 * - API client integration
 * - Response schema validation
 * - Client-side error logging
 */

'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import {
  productStudioAuditResponseSchema,
  productStudioVariantsResponseSchema,
} from '@/shared/contracts/products/studio';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  ProductStudioAuditEntry,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

type StudioDataTarget = {
  productId: string;
  selectedImageIndex: number;
  studioProjectId: string;
};

type StudioDataTargetInput = {
  productId: string | null;
  selectedImageIndex: number | null;
  studioProjectId: string | null;
};

const resolveStudioDataTarget = ({
  productId,
  selectedImageIndex,
  studioProjectId,
}: StudioDataTargetInput): StudioDataTarget | null => {
  if (productId === null || productId.length === 0) return null;
  if (studioProjectId === null || studioProjectId.length === 0) return null;
  if (selectedImageIndex === null) return null;
  return { productId, selectedImageIndex, studioProjectId };
};

const resolveSelectedVariantSlotId = (
  current: string | null,
  response: ProductStudioVariantsResponse
): string | null => {
  if (current !== null && response.variants.some((slot) => slot.id === current)) {
    return current;
  }
  return response.variants[0]?.id ?? null;
};

export type ProductStudioVariantsData = {
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
  selectedVariantSlotId: string | null;
  setSelectedVariantSlotId: Dispatch<SetStateAction<string | null>>;
  setStudioActionError: Dispatch<SetStateAction<string | null>>;
  studioActionError: string | null;
  variantsData: ProductStudioVariantsResponse | null;
  variantsLoading: boolean;
};

export const useProductStudioVariantsData = (
  input: StudioDataTargetInput
): ProductStudioVariantsData => {
  const { productId, selectedImageIndex, studioProjectId } = input;
  const [variantsData, setVariantsData] = useState<ProductStudioVariantsResponse | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [studioActionError, setStudioActionError] = useState<string | null>(null);
  const [selectedVariantSlotId, setSelectedVariantSlotId] = useState<string | null>(null);

  const refreshVariants = useCallback(async (): Promise<ProductStudioVariantsResponse | null> => {
    const target = resolveStudioDataTarget({ productId, selectedImageIndex, studioProjectId });
    if (target === null) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      return null;
    }

    setVariantsLoading(true);
    setStudioActionError(null);
    try {
      const response = productStudioVariantsResponseSchema.parse(
        await api.get<unknown>(
          `/api/v2/products/${encodeURIComponent(target.productId)}/studio/variants`,
          {
            params: {
              imageSlotIndex: target.selectedImageIndex,
              projectId: target.studioProjectId,
            },
            cache: 'no-store',
          }
        )
      );
      setVariantsData(response);
      setSelectedVariantSlotId((current) => resolveSelectedVariantSlotId(current, response));
      return response;
    } catch (error) {
      logClientError(error);
      setStudioActionError(
        error instanceof Error ? error.message : 'Failed to load Studio variants.'
      );
      return null;
    } finally {
      setVariantsLoading(false);
    }
  }, [productId, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshVariants();
  }, [refreshVariants]);

  return {
    refreshVariants,
    selectedVariantSlotId,
    setSelectedVariantSlotId,
    setStudioActionError,
    studioActionError,
    variantsData,
    variantsLoading,
  };
};

export type ProductStudioAuditData = {
  auditEntries: ProductStudioAuditEntry[];
  auditError: string | null;
  auditLoading: boolean;
  refreshAudit: () => Promise<void>;
};

export const useProductStudioAuditData = (
  input: StudioDataTargetInput
): ProductStudioAuditData => {
  const { productId, selectedImageIndex, studioProjectId } = input;
  const [auditEntries, setAuditEntries] = useState<ProductStudioAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const refreshAudit = useCallback(async (): Promise<void> => {
    const target = resolveStudioDataTarget({ productId, selectedImageIndex, studioProjectId });
    if (target === null) {
      setAuditEntries([]);
      setAuditError(null);
      return;
    }

    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = productStudioAuditResponseSchema.parse(
        await api.get<unknown>(
          `/api/v2/products/${encodeURIComponent(target.productId)}/studio/audit`,
          {
            params: { imageSlotIndex: target.selectedImageIndex, limit: 40 },
            cache: 'no-store',
            logError: false,
          }
        )
      );
      setAuditEntries(response.entries);
    } catch (error) {
      logClientError(error);
      setAuditError(error instanceof Error ? error.message : 'Failed to load history.');
    } finally {
      setAuditLoading(false);
    }
  }, [productId, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  return { auditEntries, auditError, auditLoading, refreshAudit };
};
