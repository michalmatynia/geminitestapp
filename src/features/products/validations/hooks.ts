"use client";

import { useState, useCallback } from "react";
import { validateProductCreate, validateProductUpdate, type ValidationError } from "./validators";

export type UseValidationOptions = {
  validateOnChange?: boolean;
  debounceMs?: number;
};

export type ValidationState = {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
  isValidating: boolean;
};

export function useProductCreateValidation(_options: UseValidationOptions = {}): {
  validationState: ValidationState;
  validate: (data: unknown) => Promise<ValidationState>;
  validateField: (field: string, value: unknown) => Promise<void>;
  reset: () => void;
} {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: [],
    fieldErrors: {},
    isValidating: false,
  });

  const validate = useCallback(async (data: unknown): Promise<ValidationState> => {
    setValidationState((prev: ValidationState) => ({ ...prev, isValidating: true }));
    
    const result = await validateProductCreate(data);
    const newState: ValidationState = {
      isValid: result.success,
      errors: result.success ? [] : result.errors,
      fieldErrors: result.success ? {} : result.errors.reduce((acc: Record<string, string>, error: ValidationError) => ({
        ...acc,
        [error.field]: error.message
      }), {}),
      isValidating: false,
    };

    setValidationState(newState);
    return newState;
  }, []);

  const validateField = useCallback(async (field: string, value: unknown): Promise<void> => {
    const partialData = { [field]: value };
    const result = await validateProductCreate(partialData);
    
    setValidationState((prev: ValidationState) => ({
      ...prev,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: result.success ? "" : result.errors.find((e: ValidationError) => e.field === field)?.message || ""
      }
    }));
  }, []);

  return {
    validationState,
    validate,
    validateField,
    reset: (): void => setValidationState({
      isValid: false,
      errors: [],
      fieldErrors: {},
      isValidating: false,
    })
  };
}

export function useProductUpdateValidation(_options: UseValidationOptions = {}): {
  validationState: ValidationState;
  validate: (data: unknown) => Promise<ValidationState>;
  reset: () => void;
} {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true, // Updates are more permissive
    errors: [],
    fieldErrors: {},
    isValidating: false,
  });

  const validate = useCallback(async (data: unknown): Promise<ValidationState> => {
    setValidationState((prev: ValidationState) => ({ ...prev, isValidating: true }));
    
    const result = await validateProductUpdate(data);
    const newState: ValidationState = {
      isValid: result.success,
      errors: result.success ? [] : result.errors,
      fieldErrors: result.success ? {} : result.errors.reduce((acc: Record<string, string>, error: ValidationError) => ({
        ...acc,
        [error.field]: error.message
      }), {}),
      isValidating: false,
    };

    setValidationState(newState);
    return newState;
  }, []);

  return {
    validationState,
    validate,
    reset: (): void => setValidationState({
      isValid: true,
      errors: [],
      fieldErrors: {},
      isValidating: false,
    })
  };
}