import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { ApiError } from '@/shared/lib/api-client';

import type { ProductEditHydrationToast } from './useProductEditHydration.types';

export const handleEditProductFetchError = (input: {
  error: unknown;
  editOpenRequestTokenRef: MutableRefObject<number>;
  requestToken: number;
  handleMissingEditProduct: (message: string) => void;
  setIsEditHydrating: Dispatch<SetStateAction<boolean>>;
  toast: ProductEditHydrationToast;
  clearHydrationOnError: boolean;
}): void => {
  if (input.editOpenRequestTokenRef.current !== input.requestToken) return;
  if (input.error instanceof ApiError && input.error.status === 404) {
    input.handleMissingEditProduct('This product no longer exists. Refreshing the list.');
    return;
  }
  if (input.clearHydrationOnError) {
    input.setIsEditHydrating(false);
  }
  input.toast(input.error instanceof Error ? input.error.message : 'Failed to open product editor.', {
    variant: 'error',
  });
};
