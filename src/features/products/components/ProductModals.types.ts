import type { NormalizeProductNameAiPathResult } from '@/features/products/lib/extractNormalizeProductNameFromAiPathRunDetail';

export type ProductFormScope = 'draft_template' | 'product_create' | 'product_edit';

export type NormalizeCompletionState =
  | {
      kind: 'result';
      runId: string;
      result: NormalizeProductNameAiPathResult;
    }
  | {
      kind: 'error';
      runId: string;
      error: string;
    };
