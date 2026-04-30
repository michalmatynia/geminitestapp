'use client';

'use no memo';

import { startTransition, useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'nextjs-toploader/app';

import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { productStudioLinkResponseSchema } from '@/shared/contracts/products/studio';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useAcceptVariantMutation,
  useRotateImageSlotMutation,
  useSendToStudioMutation,
} from '../hooks/useProductStudioMutations';
import { isProductStudioRunStatus } from './ProductStudioContext.constants';
import type {
  ProductStudioRunStatus,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

type StudioActionTargetInput = {
  productId: string | null;
  selectedImageIndex: number | null;
  studioProjectId: string | null;
};

type StudioActionTarget = {
  productId: string;
  selectedImageIndex: number;
  studioProjectId: string;
};

type VariantActionTarget = StudioActionTarget & {
  selectedVariantSlotId: string;
};

const resolveStudioActionTarget = ({
  productId,
  selectedImageIndex,
  studioProjectId,
}: StudioActionTargetInput): StudioActionTarget | null => {
  if (productId === null || productId.length === 0) return null;
  if (studioProjectId === null || studioProjectId.length === 0) return null;
  if (selectedImageIndex === null) return null;
  return { productId, selectedImageIndex, studioProjectId };
};

const resolveVariantActionTarget = (
  input: StudioActionTargetInput & { selectedVariantSlotId: string | null }
): VariantActionTarget | null => {
  const target = resolveStudioActionTarget(input);
  if (target === null) return null;
  if (input.selectedVariantSlotId === null || input.selectedVariantSlotId.length === 0) {
    return null;
  }
  return { ...target, selectedVariantSlotId: input.selectedVariantSlotId };
};

const resolveBaselineVariantIds = (
  variantsData: ProductStudioVariantsResponse | null
): string[] =>
  (variantsData?.variants ?? [])
    .map((slot) => slot.id)
    .filter((id) => id.length > 0);

const resolveDeleteVariantTarget = (
  studioProjectId: string | null,
  slot: ImageStudioSlotRecord
): { slotId: string; studioProjectId: string } | null => {
  if (studioProjectId === null || studioProjectId.length === 0) return null;
  if (slot.id.length === 0) return null;
  return { slotId: slot.id, studioProjectId };
};

export type ProductStudioActionHandlers = {
  accepting: boolean;
  deletingVariantId: string | null;
  handleAcceptVariant: () => Promise<void>;
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => Promise<void>;
  handleOpenInImageStudio: () => Promise<void>;
  handleRotateImageSlot: (direction: 'left' | 'right') => Promise<void>;
  handleSendToStudio: () => Promise<void>;
  openingInImageStudio: boolean;
  rotatingDirection: 'left' | 'right' | null;
  sending: boolean;
};

type UseProductStudioActionHandlersArgs = StudioActionTargetInput & {
  contextRegistry: ContextRegistryConsumerEnvelope | null;
  refreshAudit: () => Promise<void>;
  refreshImagesFromProduct: (savedProduct: ProductWithImages) => void;
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
  selectedVariantSlotId: string | null;
  setActiveRunBaselineVariantIds: Dispatch<SetStateAction<string[]>>;
  setActiveRunId: Dispatch<SetStateAction<string | null>>;
  setPendingExpectedOutputs: Dispatch<SetStateAction<number>>;
  setRunStatus: Dispatch<SetStateAction<ProductStudioRunStatus | null>>;
  setStudioActionError: Dispatch<SetStateAction<string | null>>;
  variantsData: ProductStudioVariantsResponse | null;
};

const useSendToStudioHandler = (
  args: UseProductStudioActionHandlersArgs
): { handleSendToStudio: () => Promise<void>; sending: boolean } => {
  const { toast } = useToast();
  const sendToStudioMutation = useSendToStudioMutation();

  const handleSendToStudio = useCallback(async (): Promise<void> => {
    const target = resolveStudioActionTarget(args);
    if (target === null) return;

    args.setStudioActionError(null);
    const baselineIds = resolveBaselineVariantIds(args.variantsData);
    try {
      const result = await sendToStudioMutation.mutateAsync({
        productId: target.productId,
        imageSlotIndex: target.selectedImageIndex,
        projectId: target.studioProjectId,
        ...(args.contextRegistry !== null ? { contextRegistry: args.contextRegistry } : {}),
      });
      args.setActiveRunId(result.runId);
      args.setActiveRunBaselineVariantIds(baselineIds);
      args.setRunStatus(isProductStudioRunStatus(result.runStatus) ? result.runStatus : null);
      args.setPendingExpectedOutputs(Math.max(0, Math.floor(result.expectedOutputs)));
      toast('Image sent to Studio.', { variant: 'success' });
      await args.refreshVariants();
      await args.refreshAudit();
    } catch (error) {
      logClientError(error);
      args.setStudioActionError(error instanceof Error ? error.message : 'Failed to send.');
    }
  }, [args, sendToStudioMutation, toast]);

  return { handleSendToStudio, sending: sendToStudioMutation.isPending };
};

const useOpenInImageStudioHandler = (
  args: UseProductStudioActionHandlersArgs
): { handleOpenInImageStudio: () => Promise<void>; openingInImageStudio: boolean } => {
  const router = useRouter();
  const { toast } = useToast();
  const [openingInImageStudio, setOpeningInImageStudio] = useState(false);

  const handleOpenInImageStudio = useCallback(async (): Promise<void> => {
    const target = resolveStudioActionTarget(args);
    if (target === null) return;

    setOpeningInImageStudio(true);
    try {
      const response = productStudioLinkResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(target.productId)}/studio/link`, {
          imageSlotIndex: target.selectedImageIndex,
          projectId: target.studioProjectId,
        })
      );
      const sourceSlotId = response.sourceSlot.id;
      if (sourceSlotId.length === 0) throw internalError('Source slot not found.');
      startTransition(() => {
        router.push(`/admin/image-studio?projectId=${response.projectId}&slotId=${sourceSlotId}`);
      });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to open.', { variant: 'error' });
    } finally {
      setOpeningInImageStudio(false);
    }
  }, [args, router, toast]);

  return { handleOpenInImageStudio, openingInImageStudio };
};

const useAcceptVariantHandler = (
  args: UseProductStudioActionHandlersArgs
): { accepting: boolean; handleAcceptVariant: () => Promise<void> } => {
  const { toast } = useToast();
  const acceptVariantMutation = useAcceptVariantMutation();

  const handleAcceptVariant = useCallback(async (): Promise<void> => {
    const target = resolveVariantActionTarget(args);
    if (target === null) return;

    try {
      const response = await acceptVariantMutation.mutateAsync({
        productId: target.productId,
        imageSlotIndex: target.selectedImageIndex,
        generationSlotId: target.selectedVariantSlotId,
        projectId: target.studioProjectId,
      });
      args.refreshImagesFromProduct(response.product);
      toast('Variant accepted.', { variant: 'success' });
      await args.refreshVariants();
      await args.refreshAudit();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to accept.', { variant: 'error' });
    }
  }, [acceptVariantMutation, args, toast]);

  return { accepting: acceptVariantMutation.isPending, handleAcceptVariant };
};

const useDeleteVariantHandler = (
  args: UseProductStudioActionHandlersArgs
): { deletingVariantId: string | null; handleDeleteVariant: (slot: ImageStudioSlotRecord) => Promise<void> } => {
  const { toast } = useToast();
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);

  const handleDeleteVariant = useCallback(async (slot: ImageStudioSlotRecord): Promise<void> => {
    const target = resolveDeleteVariantTarget(args.studioProjectId, slot);
    if (target === null) return;

    setDeletingVariantId(target.slotId);
    try {
      await api.post(
        `/api/image-studio/projects/${encodeURIComponent(target.studioProjectId)}/variants/delete`,
        { slotId: target.slotId, sourceSlotId: args.variantsData?.sourceSlotId }
      );
      toast('Variant deleted.', { variant: 'success' });
      await args.refreshVariants();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete.', { variant: 'error' });
    } finally {
      setDeletingVariantId(null);
    }
  }, [args, toast]);

  return { deletingVariantId, handleDeleteVariant };
};

const useRotateImageSlotHandler = (
  args: UseProductStudioActionHandlersArgs
): {
  handleRotateImageSlot: (direction: 'left' | 'right') => Promise<void>;
  rotatingDirection: 'left' | 'right' | null;
} => {
  const { toast } = useToast();
  const rotateImageSlotMutation = useRotateImageSlotMutation();

  const handleRotateImageSlot = useCallback(async (direction: 'left' | 'right'): Promise<void> => {
    const target = resolveStudioActionTarget(args);
    if (target === null) return;

    try {
      const response = await rotateImageSlotMutation.mutateAsync({
        productId: target.productId,
        imageSlotIndex: target.selectedImageIndex,
        direction,
      });
      args.refreshImagesFromProduct(response.product);
      await args.refreshVariants();
      toast('Image rotated.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to rotate.', { variant: 'error' });
    }
  }, [args, rotateImageSlotMutation, toast]);

  return {
    handleRotateImageSlot,
    rotatingDirection: rotateImageSlotMutation.isPending
      ? rotateImageSlotMutation.variables.direction
      : null,
  };
};

export const useProductStudioActionHandlers = (
  args: UseProductStudioActionHandlersArgs
): ProductStudioActionHandlers => ({
  ...useSendToStudioHandler(args),
  ...useOpenInImageStudioHandler(args),
  ...useAcceptVariantHandler(args),
  ...useDeleteVariantHandler(args),
  ...useRotateImageSlotHandler(args),
});
