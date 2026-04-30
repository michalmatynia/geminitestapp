'use client';

'use no memo';

import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useProductStudioProviderController } from './ProductStudioContext.controller';
import type {
  ProductStudioActionsContextValue,
  ProductStudioContextValue,
  ProductStudioStateContextValue,
} from './ProductStudioContext.types';

export type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioActionsContextValue,
  ProductStudioContextValue,
  ProductStudioRunStatus,
  ProductStudioStateContextValue,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

const ProductStudioStateContext = createContext<ProductStudioStateContextValue | null>(null);
const ProductStudioActionsContext = createContext<ProductStudioActionsContextValue | null>(null);

export function ProductStudioProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { actionsValue, stateValue } = useProductStudioProviderController();

  return (
    <ProductStudioActionsContext.Provider value={actionsValue}>
      <ProductStudioStateContext.Provider value={stateValue}>
        {children}
      </ProductStudioStateContext.Provider>
    </ProductStudioActionsContext.Provider>
  );
}

export function useProductStudioState(): ProductStudioStateContextValue {
  const context = useContext(ProductStudioStateContext);
  if (context === null) {
    throw internalError('useProductStudioState must be used within ProductStudioProvider');
  }
  return context;
}

export function useProductStudioActions(): ProductStudioActionsContextValue {
  const context = useContext(ProductStudioActionsContext);
  if (context === null) {
    throw internalError('useProductStudioActions must be used within ProductStudioProvider');
  }
  return context;
}

export function useProductStudioContext(): ProductStudioContextValue {
  const state = useProductStudioState();
  const actions = useProductStudioActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
