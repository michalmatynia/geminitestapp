/**
 * Form Validation Utilities
 * 
 * Standardized form validation using Zod schemas with user-friendly error handling.
 * Provides:
 * - Type-safe form validation with structured error results
 * - Field-level error mapping for form UI integration
 * - Form-level error aggregation
 * - First error extraction for simple error display
 * - Consistent validation result format across the application
 * 
 * This utility bridges Zod validation with React form libraries,
 * providing a consistent interface for form error handling.
 */

import { type z } from 'zod';

/**
 * Field-level validation errors mapped by field name
 */
export type FormFieldErrors = Record<string, string[]>;

/**
 * Standardized form validation result with success/error states
 */
export type FormValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      fieldErrors: FormFieldErrors;
      formErrors: string[];
      firstError: string;
    };

/**
 * Extract the first field error for simple error display
 */
const getFirstFieldError = (fieldErrors: FormFieldErrors): string | null => {
  const fields = Object.keys(fieldErrors);
  for (const field of fields) {
    const messages = fieldErrors[field];
    if (!Array.isArray(messages)) continue;
    const first = messages.find(
      (message: string) => typeof message === 'string' && message.trim().length > 0
    );
    if (first !== undefined) return first;
  }
  return null;
};

/**
 * Validate form data using Zod schema with structured error handling
 * Returns either validated data or detailed error information
 */
export const validateFormData = <T>(
  schema: z.ZodType<T>,
  payload: unknown,
  fallbackMessage = 'Validation failed.'
): FormValidationResult<T> => {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = result.error.flatten();
  const fieldErrors: FormFieldErrors = {};

  // Process field-level errors
  Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
    if (!Array.isArray(messages)) return;
    const normalized = messages.filter(
      (message): message is string => typeof message === 'string' && message.trim().length > 0
    );
    if (normalized.length === 0) return;
    fieldErrors[field] = normalized;
  });

  const formErrors = flattened.formErrors.filter((message: string) => message.trim().length > 0);
  const firstError = formErrors[0] ?? getFirstFieldError(fieldErrors) ?? fallbackMessage;

  return {
    success: false,
    fieldErrors,
    formErrors,
    firstError,
  };
};
