import { NextResponse } from 'next/server';

import { validateProductCreate, validateProductUpdate, type ValidationError } from './validators';

export type ValidationMiddlewareOptions = {
  skipValidation?: boolean;
  customErrorHandler?: (errors: ValidationError[]) => Response;
};

export async function validateProductCreateMiddleware(
  formData: FormData,
  options: ValidationMiddlewareOptions = {}
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  if (options.skipValidation) {
    return { success: true, data: Object.fromEntries(formData.entries()) };
  }

  const data = Object.fromEntries(formData.entries());
  const result = await validateProductCreate(data);

  if (!result.success) {
    const response = options.customErrorHandler 
      ? options.customErrorHandler(result.errors)
      : NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.errors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    return { success: false, response };
  }

  return { success: true, data: result.data };
}

export async function validateProductUpdateMiddleware(
  formData: FormData,
  options: ValidationMiddlewareOptions = {}
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  if (options.skipValidation) {
    return { success: true, data: Object.fromEntries(formData.entries()) };
  }

  const data = Object.fromEntries(formData.entries());
  const result = await validateProductUpdate(data);

  if (!result.success) {
    const response = options.customErrorHandler 
      ? options.customErrorHandler(result.errors)
      : NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.errors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    return { success: false, response };
  }

  return { success: true, data: result.data };
}