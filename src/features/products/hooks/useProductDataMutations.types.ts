import type { QueryClient } from '@tanstack/react-query';

import type { IdDataDto } from '@/shared/contracts/base';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type ProductUpdateData = Partial<ProductWithImages> | FormData;

export type ProductUpdateVariables = IdDataDto<ProductUpdateData> & {
  originalSku?: string | null;
  originalNameEn?: string | null;
};

export type ProductIdentityResolution =
  | { kind: 'resolved'; id: string }
  | { kind: 'ambiguous'; matchCount: number }
  | { kind: 'missing' };

export type QueryClientMutationContext = {
  queryClient: QueryClient;
};
