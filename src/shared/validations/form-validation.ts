import { z } from 'zod';

export type FormFieldErrors = Record<string, string[]>;

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

const getFirstFieldError = (fieldErrors: FormFieldErrors): string | null => {
  const fields = Object.keys(fieldErrors);
  for (const field of fields) {
    const messages = fieldErrors[field];
    if (!Array.isArray(messages)) continue;
    const first = messages.find((message: string) => typeof message === 'string' && message.trim().length > 0);
    if (first) return first;
  }
  return null;
};

export const validateFormData = <T>(
  schema: z.ZodType<T>,
  payload: unknown,
  fallbackMessage = 'Validation failed.',
): FormValidationResult<T> => {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = result.error.flatten();
  const fieldErrors: FormFieldErrors = {};

  Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
    if (!Array.isArray(messages)) return;
    const normalized = messages.filter((message): message is string => typeof message === 'string' && message.trim().length > 0);
    if (normalized.length === 0) return;
    fieldErrors[field] = normalized;
  });

  const formErrors = (flattened.formErrors || []).filter((message: string) => message.trim().length > 0);
  const firstError = formErrors[0] || getFirstFieldError(fieldErrors) || fallbackMessage;

  return {
    success: false,
    fieldErrors,
    formErrors,
    firstError,
  };
};
