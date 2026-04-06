'use client';

import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import { createStrictViewContext } from '../../createStrictViewContext';

type ListProductModalFormContextValue = {
  error: string | null;
  submitting: boolean;
  onRetryImageExport: (preset: ImageRetryPreset) => void;
  authRequired: boolean;
  loggingIn: boolean;
  onTraderaLogin: () => void;
  onRetrySubmit: () => void;
};

export const {
  Provider: ListProductModalFormProvider,
  useValue: useListProductModalFormContext,
} = createStrictViewContext<ListProductModalFormContextValue>({
  providerName: 'ListProductModalFormProvider',
  errorMessage: 'useListProductModalFormContext must be used within ListProductModalFormProvider',
});
