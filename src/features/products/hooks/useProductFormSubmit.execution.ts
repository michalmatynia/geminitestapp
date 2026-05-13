import { getProductCreateRuntimeStatus } from '@/features/products/api/products';
import {
  isProductCreateRuntimeQueuedResponse,
  type ProductCreateMutationResult,
  type ProductCreateRuntimeQueuedResponse,
  type ProductCreateRuntimeStatusResponse,
} from '@/shared/contracts/products';
import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { Toast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { isEditingProductHydrated, markEditingProductHydrated } from './editingProductHydration';
import { buildProductFormData, type BuildProductFormDataInput } from './useProductFormSubmit.payload';

type ProductFormSubmitSuccess = (info?: { queued?: boolean }) => void;
type ProductFormEditSave = (saved: ProductWithImages) => void;
type CreateProductMutation = (
  formData: FormData
) => Promise<ProductCreateMutationResult | null | undefined>;
type UpdateProductMutation = (input: {
  id: string;
  data: FormData;
  originalSku?: string | undefined;
  originalNameEn?: string | undefined;
}) => Promise<ProductWithImages | null | undefined>;

export type ProductFormSubmitExecutionResult = {
  backgroundTask?: Promise<void> | undefined;
};

export type ProductFormSubmitExecutionInput = BuildProductFormDataInput & {
  product?: ProductWithImages | undefined;
  requireHydratedEditProduct: boolean;
  createProduct: CreateProductMutation;
  updateProduct: UpdateProductMutation;
  refreshImages: (savedProduct: ProductWithImages) => void;
  onSuccess?: ProductFormSubmitSuccess | undefined;
  onEditSave?: ProductFormEditSave | undefined;
  setUploadError: (message: string | null) => void;
  setUploadSuccess: (success: boolean) => void;
  successTimerRef: { current: ReturnType<typeof setTimeout> | null };
  toast: Toast;
};

const PRODUCT_CREATE_RUNTIME_POLL_TIMEOUT_MS = 180_000;
const PRODUCT_CREATE_RUNTIME_POLL_INTERVAL_MS = 1000;

export const hasTemporaryProductImages = (imageSlots: (ProductImageSlot | null)[]): boolean =>
  imageSlots.some((slot: ProductImageSlot | null): boolean => {
    if (slot === null) return false;
    if (slot.type === 'file') return true;
    return slot.previewUrl.startsWith('/uploads/products/temp/');
  });

const resolveTrimmedPersistedValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed !== '' ? trimmed : undefined;
};

const guardHydratedEditProduct = ({
  product,
  requireHydratedEditProduct,
  setUploadError,
  toast,
}: Pick<
  ProductFormSubmitExecutionInput,
  'product' | 'requireHydratedEditProduct' | 'setUploadError' | 'toast'
>): boolean => {
  if (product === undefined || !requireHydratedEditProduct) return true;
  if (isEditingProductHydrated(product)) return true;

  const message = 'Product details are still loading. Wait a moment and try again.';
  setUploadError(message);
  toast(message, { variant: 'warning' });
  return false;
};

const saveProductForm = async (
  input: ProductFormSubmitExecutionInput,
  formData: FormData
): Promise<ProductCreateMutationResult | null | undefined> => {
  if (input.product === undefined) {
    return await input.createProduct(formData);
  }

  return await input.updateProduct({
    id: input.product.id,
    data: formData,
    originalSku: resolveTrimmedPersistedValue(input.product.sku),
    originalNameEn: resolveTrimmedPersistedValue(input.product.name_en),
  });
};

const scheduleUploadSuccessReset = (
  successTimerRef: ProductFormSubmitExecutionInput['successTimerRef'],
  setUploadSuccess: ProductFormSubmitExecutionInput['setUploadSuccess']
): void => {
  const timerRef = successTimerRef;
  if (timerRef.current !== null) {
    clearTimeout(timerRef.current);
  }
  timerRef.current = setTimeout((): void => {
    setUploadSuccess(false);
  }, 3000);
};

const handleUpdatedProductSave = (
  savedProduct: ProductWithImages,
  input: ProductFormSubmitExecutionInput
): void => {
  input.refreshImages(savedProduct);
  input.setUploadSuccess(true);
  scheduleUploadSuccessReset(input.successTimerRef, input.setUploadSuccess);
  if (input.onSuccess === undefined) {
    input.toast('Product updated successfully.', { variant: 'success' });
  }
  input.onEditSave?.(markEditingProductHydrated(savedProduct));
  input.onSuccess?.();
};

const handleCreatedProductSave = (
  savedProduct: ProductCreateMutationResult | null | undefined,
  input: ProductFormSubmitExecutionInput
): void => {
  if (isProductCreateRuntimeQueuedResponse(savedProduct)) return;
  if (savedProduct === null || savedProduct === undefined) return;
  input.onSuccess?.();
};

const delayRuntimePoll = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, PRODUCT_CREATE_RUNTIME_POLL_INTERVAL_MS);
  });

const pollRuntimeCreateStatus = async (
  requestId: string,
  deadlineMs: number
): Promise<ProductCreateRuntimeStatusResponse | null> => {
  const status = await getProductCreateRuntimeStatus(requestId);
  if (status.status === 'completed' || status.status === 'failed') {
    return status;
  }
  if (Date.now() >= deadlineMs) {
    return null;
  }
  await delayRuntimePoll();
  return pollRuntimeCreateStatus(requestId, deadlineMs);
};

const waitForRuntimeCreateCompletion = async (
  response: ProductCreateRuntimeQueuedResponse,
  input: ProductFormSubmitExecutionInput
): Promise<void> => {
  const status = await pollRuntimeCreateStatus(
    response.requestId,
    Date.now() + PRODUCT_CREATE_RUNTIME_POLL_TIMEOUT_MS
  );
  if (status?.status === 'completed') {
    input.onSuccess?.();
    return;
  }
  if (status?.status === 'failed') {
    const message = status.errorMessage ?? 'Product creation failed in runtime.';
    input.setUploadError(message);
    input.toast(message, { variant: 'error' });
    return;
  }

  input.toast('Product creation is still running. The product list will update after completion.', {
    variant: 'warning',
  });
};

const startCreateProductInRuntime = (
  input: ProductFormSubmitExecutionInput,
  formData: FormData
): ProductFormSubmitExecutionResult => {
  const backgroundTask = Promise.resolve()
    .then(() => input.createProduct(formData))
    .then(async (savedProduct: ProductCreateMutationResult | null | undefined): Promise<void> => {
      if (isProductCreateRuntimeQueuedResponse(savedProduct)) {
        await waitForRuntimeCreateCompletion(savedProduct, input);
        return;
      }
      handleCreatedProductSave(savedProduct, input);
    })
    .catch((error: unknown): void => {
      handleSubmitError(error, input);
    });

  input.onSuccess?.({ queued: true });
  input.toast('Product creation is running in runtime.', { variant: 'info' });
  return { backgroundTask };
};

const handleSavedProduct = (
  savedProduct: ProductCreateMutationResult | null | undefined,
  input: ProductFormSubmitExecutionInput
): void => {
  if (isProductCreateRuntimeQueuedResponse(savedProduct)) {
    input.onSuccess?.({ queued: true });
    return;
  }
  if (savedProduct === null || savedProduct === undefined) {
    input.onSuccess?.({ queued: true });
    return;
  }
  if (input.product === undefined) {
    input.onSuccess?.();
    return;
  }
  handleUpdatedProductSave(savedProduct, input);
};

const handleSubmitError = (error: unknown, input: ProductFormSubmitExecutionInput): void => {
  logClientCatch(error, {
    service: 'product-form',
    action: 'submit',
    productId: input.product?.id,
  });
  input.setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
};

export const executeProductFormSubmit = async (
  input: ProductFormSubmitExecutionInput
): Promise<ProductFormSubmitExecutionResult> => {
  try {
    if (!guardHydratedEditProduct(input)) return {};
    const formData = buildProductFormData(input);
    if (input.product === undefined) {
      return startCreateProductInRuntime(input, formData);
    }

    const savedProduct = await saveProductForm(input, formData);
    handleSavedProduct(savedProduct, input);
    return {};
  } catch (error: unknown) {
    handleSubmitError(error, input);
    return {};
  }
};
