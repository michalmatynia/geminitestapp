'use client';

import { createStrictViewContext } from '../../createStrictViewContext';

type MassListProductModalViewContextValue = {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const {
  Provider: MassListProductModalViewProvider,
  useValue: useMassListProductModalViewContext,
} = createStrictViewContext<MassListProductModalViewContextValue>({
  providerName: 'MassListProductModalViewProvider',
  errorMessage:
    'useMassListProductModalViewContext must be used within MassListProductModalViewProvider',
});
