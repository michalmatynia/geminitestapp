import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { Toast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { isEditingProductHydrated, markEditingProductHydrated } from './editingProductHydration';
import { buildProductFormData, type BuildProductFormDataInput } from './useProductFormSubmit.payload';

type ProductFormSubmitSuccess = (info?: { queued?: boolean }) => void;
type ProductFormEditSave = (saved: ProductWithImages) => void;
type CreateProductMutation = (formData: FormData) => Promise<ProductWithImages | null | undefined>;
type UpdateProductMutation = (input: {
  id: string;
  data: FormData;
  originalSku?: string | undefined;
  originalNameEn?: string | undefined;
}) => Promise<ProductWithImages | null | undefined>;

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
): Promise<ProductWithImages | null | undefined> => {
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

const handleSavedProduct = (
  savedProduct: ProductWithImages | null | undefined,
  input: ProductFormSubmitExecutionInput
): void => {
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
): Promise<void> => {
  try {
    if (!guardHydratedEditProduct(input)) return;
    const savedProduct = await saveProductForm(input, buildProductFormData(input));
    handleSavedProduct(savedProduct, input);
  } catch (error: unknown) {
    handleSubmitError(error, input);
  }
};
