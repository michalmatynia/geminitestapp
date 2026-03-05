'use client';

import React, { createContext, useReducer, type ReactNode } from 'react';

import type { ValidationError } from '@/shared/lib/products/validations/validators';

type ValidationContextState = {
  globalErrors: ValidationError[];
  fieldValidations: Record<string, { isValid: boolean; message?: string | undefined }>;
  isValidating: boolean;
};

type ValidationAction =
  | { type: 'SET_GLOBAL_ERRORS'; errors: ValidationError[] }
  | { type: 'SET_FIELD_VALIDATION'; field: string; isValid: boolean; message?: string | undefined }
  | { type: 'CLEAR_FIELD_VALIDATION'; field: string }
  | { type: 'SET_VALIDATING'; isValidating: boolean }
  | { type: 'RESET' };

const initialState: ValidationContextState = {
  globalErrors: [],
  fieldValidations: {},
  isValidating: false,
};

function validationReducer(
  state: ValidationContextState,
  action: ValidationAction
): ValidationContextState {
  switch (action.type) {
    case 'SET_GLOBAL_ERRORS':
      return { ...state, globalErrors: action.errors };
    case 'SET_FIELD_VALIDATION':
      return {
        ...state,
        fieldValidations: {
          ...state.fieldValidations,
          [action.field]: { isValid: action.isValid, message: action.message },
        },
      };
    case 'CLEAR_FIELD_VALIDATION': {
      const { [action.field]: _, ...rest } = state.fieldValidations;
      return { ...state, fieldValidations: rest };
    }
    case 'SET_VALIDATING':
      return { ...state, isValidating: action.isValidating };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const ValidationContext = createContext<{
  state: ValidationContextState;
  dispatch: React.Dispatch<ValidationAction>;
} | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(validationReducer, initialState);

  return (
    <ValidationContext.Provider value={{ state, dispatch }}>{children}</ValidationContext.Provider>
  );
}
