'use client';

import { useState } from 'react';

import type {
  ProductBatchEditRequest,
  ProductBatchEditResponse,
} from '@/shared/contracts/products';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildOperation,
  createDraftOperation,
  getAllowedModes,
  getDefinition,
  validateDrafts,
  type ProductBatchEditDraftOperation,
} from './ProductBatchEditModal.helpers';

type UseProductBatchEditModalStateInput = {
  productIds: string[];
  onSubmit: (request: ProductBatchEditRequest) => Promise<ProductBatchEditResponse>;
  onApplied: (response: ProductBatchEditResponse) => void;
};

export type ProductBatchEditModalState = {
  drafts: ProductBatchEditDraftOperation[];
  lastResponse: ProductBatchEditResponse | null;
  selectedCount: number;
  addDraft: () => void;
  removeDraft: (id: string) => void;
  updateDraft: (id: string, update: Partial<ProductBatchEditDraftOperation>) => void;
  submit: (dryRun: boolean) => Promise<void>;
};

const buildRequest = (
  productIds: string[],
  drafts: ProductBatchEditDraftOperation[],
  dryRun: boolean
): ProductBatchEditRequest => ({ productIds, dryRun, operations: drafts.map(buildOperation) });

const getSubmitToastVariant = (response: ProductBatchEditResponse): 'success' | 'warning' =>
  response.failed > 0 ? 'warning' : 'success';

const normalizeDraftMode = (
  draft: ProductBatchEditDraftOperation
): ProductBatchEditDraftOperation => {
  const allowedModes = getAllowedModes(getDefinition(draft.field));
  return allowedModes.includes(draft.mode)
    ? draft
    : { ...draft, mode: allowedModes[0] ?? 'set' };
};

export function useProductBatchEditModalState({
  productIds,
  onSubmit,
  onApplied,
}: UseProductBatchEditModalStateInput): ProductBatchEditModalState {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<ProductBatchEditDraftOperation[]>([createDraftOperation()]);
  const [lastResponse, setLastResponse] = useState<ProductBatchEditResponse | null>(null);
  const selectedCount = productIds.length;

  const updateDraft = (id: string, update: Partial<ProductBatchEditDraftOperation>): void => {
    setLastResponse(null);
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? normalizeDraftMode({ ...draft, ...update }) : draft))
    );
  };
  const removeDraft = (id: string): void => {
    setLastResponse(null);
    setDrafts((current) =>
      current.length === 1 ? current : current.filter((draft) => draft.id !== id)
    );
  };
  const addDraft = (): void => {
    setLastResponse(null);
    setDrafts((current) => [...current, createDraftOperation()]);
  };
  const submit = async (dryRun: boolean): Promise<void> => {
    if (selectedCount === 0) {
      toast('Select products before editing fields.', { variant: 'error' });
      return;
    }
    const validationError = validateDrafts(drafts);
    if (validationError !== null) {
      toast(validationError, { variant: 'error' });
      return;
    }
    try {
      const response = await onSubmit(buildRequest(productIds, drafts, dryRun));
      setLastResponse(response);
      if (dryRun) {
        toast('Batch edit preview generated.', { variant: 'success' });
        return;
      }
      toast(`Batch edit applied to ${response.changed} product${response.changed === 1 ? '' : 's'}.`, {
        variant: getSubmitToastVariant(response),
      });
      onApplied(response);
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to run batch edit.', { variant: 'error' });
    }
  };

  return { drafts, lastResponse, selectedCount, addDraft, removeDraft, updateDraft, submit };
}
