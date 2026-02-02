"use client";

import { useState, useCallback, useMemo } from "react";
import { validateProductCreate, validateProductUpdate, type ValidationError } from "./validators";
import type { ProductCreateInput, ProductUpdateInput } from "./schemas";

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

export function useProductCreateValidation(options: UseValidationOptions = {}) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: [],
    fieldErrors: {},
    isValidating: false,
  });

  const validate = useCallback(async (data: unknown): Promise<ValidationState> => {
    setValidationState(prev => ({ ...prev, isValidating: true }));
    
    const result = await validateProductCreate(data);
    const newState: ValidationState = {
      isValid: result.success,
      errors: result.success ? [] : result.errors,
      fieldErrors: result.success ? {} : result.errors.reduce((acc, error) => ({
        ...acc,
        [error.field]: error.message
      }), {}),
      isValidating: false,
    };

    setValidationState(newState);
    return newState;
  }, []);

  const validateField = useCallback(async (field: string, value: unknown) => {
    const partialData = { [field]: value };
    const result = await validateProductCreate(partialData);
    
    setValidationState(prev => ({
      ...prev,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: result.success ? "" : result.errors.find(e => e.field === field)?.message || ""
      }
    }));
  }, []);

  return {
    validationState,
    validate,
    validateField,
    reset: () => setValidationState({
      isValid: false,
      errors: [],
      fieldErrors: {},
      isValidating: false,
    })
  };
}

export function useProductUpdateValidation(options: UseValidationOptions = {}) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true, // Updates are more permissive
    errors: [],
    fieldErrors: {},
    isValidating: false,
  });

  const validate = useCallback(async (data: unknown): Promise<ValidationState> => {
    setValidationState(prev => ({ ...prev, isValidating: true }));
    
    const result = await validateProductUpdate(data);
    const newState: ValidationState = {
      isValid: result.success,
      errors: result.success ? [] : result.errors,
      fieldErrors: result.success ? {} : result.errors.reduce((acc, error) => ({
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
    reset: () => setValidationState({
      isValid: true,
      errors: [],
      fieldErrors: {},
      isValidating: false,
    })
  };
}