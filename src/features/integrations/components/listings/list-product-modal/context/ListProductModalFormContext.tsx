'use client';

import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import { createStrictViewContext } from '../../createStrictViewContext';

type ListProductModalFormContextValue = {
  error: string | null;
  submitting: boolean;
  onRetryImageExport: (preset: ImageRetryPreset) => void;
};

export const {
  Provider: ListProductModalFormProvider,
  useValue: useListProductModalFormContext,
} = createStrictViewContext<ListProductModalFormContextValue>({
  providerName: 'ListProductModalFormProvider',
  errorMessage: 'useListProductModalFormContext must be used within ListProductModalFormProvider',
});
