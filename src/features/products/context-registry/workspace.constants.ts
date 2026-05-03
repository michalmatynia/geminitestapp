import type { ContextRegistryRef } from '@/shared/contracts/ai-context-registry';

import { resolveProductEditorEntityKey } from './workspace.helpers';

export const PRODUCT_EDITOR_CONTEXT_ROOT_IDS = [
  'page:product-editor',
  'component:product-form',
  'component:product-form-validation-tab',
  'component:product-form-studio',
  'action:product-validator-runtime-evaluate',
  'action:product-studio-send',
  'collection:products',
  'collection:image-studio-projects',
  'collection:image-studio-slots',
  'collection:image-studio-runs',
  'collection:image-studio-sequence-runs',
] as const;

export const PRODUCT_EDITOR_CONTEXT_RUNTIME_PROVIDER_ID = 'product-editor-local';
export const PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE = 'product_editor_studio_state';
export const PRODUCT_EDITOR_CONTEXT_RUNTIME_REF_PREFIX = 'runtime:product-editor:studio:';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_PROVIDER_ID = 'product-editor-local';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE = 'product_editor_workspace_state';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_REF_PREFIX =
  'runtime:product-editor:workspace:';
export const PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_PROVIDER_ID = 'product-editor-local';
export const PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_ENTITY_TYPE =
  'product_editor_leaf_categories';
export const PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_REF_PREFIX =
  'runtime:product-editor:leaf-categories:';

const encodeSegment = (value: string): string => encodeURIComponent(value.trim());

export const createProductEditorWorkspaceRef = ({
  productId,
  draftId,
}: {
  productId: string | null;
  draftId: string | null;
}): ContextRegistryRef => ({
  id: `${PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_REF_PREFIX}${encodeSegment(
    resolveProductEditorEntityKey({ productId, draftId })
  )}`,
  kind: 'runtime_document',
  providerId: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_PROVIDER_ID,
  entityType: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE,
});

export const createProductStudioWorkspaceRef = (productId: string): ContextRegistryRef => ({
  id: `${PRODUCT_EDITOR_CONTEXT_RUNTIME_REF_PREFIX}${encodeSegment(productId)}`,
  kind: 'runtime_document',
  providerId: PRODUCT_EDITOR_CONTEXT_RUNTIME_PROVIDER_ID,
  entityType: PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE,
});

export const createProductLeafCategoriesWorkspaceRef = (
  selectedCatalogIds: string[]
): ContextRegistryRef => ({
  id: `${PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_REF_PREFIX}${encodeSegment(
    selectedCatalogIds.length > 0 ? selectedCatalogIds.join('|') : 'all'
  )}`,
  kind: 'runtime_document',
  providerId: PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_PROVIDER_ID,
  entityType: PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_ENTITY_TYPE,
});
