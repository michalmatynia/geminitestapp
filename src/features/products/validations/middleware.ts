import { createValidationErrorResponse } from '@/shared/lib/api/handle-api-error';
import { buildNormalizedProductValidationPayload } from '@/shared/lib/products/services/product-service-form-utils';
import {
  validateProductCreate,
  validateProductUpdate,
  type ValidationError,
} from '@/shared/lib/products/validations/validators';

export type ValidationMiddlewareOptions = {
  skipValidation?: boolean;
  customErrorHandler?: (errors: ValidationError[]) => Response;
};

const toValidationPayload = (formData: FormData): Record<string, unknown> => {
  return buildNormalizedProductValidationPayload(formData);
};

export async function validateProductCreateMiddleware(
  formData: FormData,
  options: ValidationMiddlewareOptions = {}
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  if (options.skipValidation) {
    return { success: true, data: toValidationPayload(formData) };
  }

  const data = toValidationPayload(formData);
  const result = await validateProductCreate(data);

  if (!result.success) {
    if (options.customErrorHandler) {
      return { success: false, response: options.customErrorHandler(result.errors) };
    }
    const fieldErrors: Record<string, string[]> = {};
    result.errors.forEach((err: ValidationError) => {
      fieldErrors[err.field] ??= [];
      fieldErrors[err.field].push(err.message);
    });
    const response = await createValidationErrorResponse(fieldErrors, {
      source: 'products.validation.create',
    });
    return { success: false, response };
  }

  return { success: true, data: result.data };
}

export async function validateProductUpdateMiddleware(
  formData: FormData,
  options: ValidationMiddlewareOptions = {}
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  if (options.skipValidation) {
    return { success: true, data: toValidationPayload(formData) };
  }

  const data = toValidationPayload(formData);
  const result = await validateProductUpdate(data);

  if (!result.success) {
    if (options.customErrorHandler) {
      return { success: false, response: options.customErrorHandler(result.errors) };
    }
    const fieldErrors: Record<string, string[]> = {};
    result.errors.forEach((err: ValidationError) => {
      fieldErrors[err.field] ??= [];
      fieldErrors[err.field].push(err.message);
    });
    const response = await createValidationErrorResponse(fieldErrors, {
      source: 'products.validation.update',
    });
    return { success: false, response };
  }

  return { success: true, data: result.data };
}
