'use client';

import {
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { UseFormSetValue, UseFormGetValues, FieldErrors } from 'react-hook-form';

export interface FormStateOptions<T extends Record<string, any>> {
  /**
   * Initial form values
   */
  initialValues: T;
  
  /**
   * Validation function that returns errors or empty object if valid
   */
  validate?: (values: T) => Promise<Partial<Record<keyof T, string>>>;
  
  /**
   * Submit handler
   */
  onSubmit: (values: T) => Promise<void>;
  
  /**
   * Called on validation error before submit
   */
  onValidationError?: (errors: Partial<Record<keyof T, string>>) => void;
  
  /**
   * Called on submit error
   */
  onSubmitError?: (error: Error) => void;
  
  /**
   * Called on submit success
   */
  onSubmitSuccess?: () => void;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

export interface FormActions<T extends Record<string, any>> {
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  clearErrors: () => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  getValues: () => T;
  getValue: (field: keyof T) => any;
}

/**
 * Generic form state management hook.
 * Consolidates ProductFormContext, NoteFormContext, etc. patterns.
 *
 * @example
 * const { state, actions } = useFormState({
 *   initialValues: { name: '', email: '' },
 *   validate: async (values) => {
 *     const errors: Record<string, string> = {};
 *     if (!values.name) errors.name = 'Name is required';
 *     return errors;
 *   },
 *   onSubmit: async (values) => {
 *     await api.create(values);
 *   },
 * });
 */
export function useFormState<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
  onValidationError,
  onSubmitError,
  onSubmitSuccess,
}: FormStateOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValuesRef = useRef(initialValues);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setValuesImpl = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Validate
      if (validate) {
        const validationErrors = await validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          onValidationError?.(validationErrors);
          setIsSubmitting(false);
          return;
        }
      }

      // Submit
      await onSubmit(values);
      onSubmitSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onSubmitError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit, onValidationError, onSubmitError, onSubmitSuccess]);

  const reset = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
  }, []);

  const getValues = useCallback(() => values, [values]);

  const getValue = useCallback((field: keyof T) => values[field], [values]);

  return {
    state: {
      values,
      errors,
      isSubmitting,
      isDirty,
      isValid,
    },
    actions: {
      setValue,
      setValues: setValuesImpl,
      setFieldError,
      clearFieldError,
      clearErrors,
      handleSubmit,
      reset,
      getValues,
      getValue,
    },
  };
}
