'use client';

import { createStrictViewContext } from '../../createStrictViewContext';

type SelectProductForListingModalViewContextValue = {
  onClose: () => void;
  onSuccess: () => void;
};

export const {
  Provider: SelectProductForListingModalViewProvider,
  useValue: useSelectProductForListingModalView,
} = createStrictViewContext<SelectProductForListingModalViewContextValue>({
  providerName: 'SelectProductForListingModalViewProvider',
  errorMessage:
    'useSelectProductForListingModalView must be used within SelectProductForListingModalViewProvider',
});
