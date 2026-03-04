import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  ProductDraft,
  CreateProductDraftInput,
  UpdateProductDraftInput,
} from '@/features/products/server';

import * as repo from './draft-repository';

/**
 * Service that wraps the Draft repository with error handling and logging.
 */

export const listDrafts = async (): Promise<ProductDraft[]> => {
  try {
    return await repo.listDrafts();
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'draft-service',
      action: 'listDrafts',
    });
    throw error;
  }
};

export const getDraft = async (id: string): Promise<ProductDraft | null> => {
  try {
    return await repo.getDraft(id);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'draft-service',
      action: 'getDraft',
      draftId: id,
    });
    throw error;
  }
};

export const createDraft = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  try {
    return await repo.createDraft(input);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'draft-service',
      action: 'createDraft',
      draftName: input.name,
    });
    throw error;
  }
};

export const updateDraft = async (
  id: string,
  input: UpdateProductDraftInput
): Promise<ProductDraft | null> => {
  try {
    return await repo.updateDraft(id, input);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'draft-service',
      action: 'updateDraft',
      draftId: id,
    });
    throw error;
  }
};

export const deleteDraft = async (id: string): Promise<boolean> => {
  try {
    return await repo.deleteDraft(id);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'draft-service',
      action: 'deleteDraft',
      draftId: id,
    });
    throw error;
  }
};
