import { JSX } from 'react';

import {
  InternationalizationSettings,
  InternationalizationProvider,
  CountryModal,
  CurrencyModal,
  LanguageModal,
} from '@/features/internationalization/public';
import { ProductSettingsPage } from '@/features/products/public/product-settings-page';
import { ProductSyncSettings } from '@/features/product-sync/public';

export default function Page(): JSX.Element {
  return (
    <ProductSettingsPage
      internationalizationSettingsSlot={<InternationalizationSettings />}
      internationalizationProvider={InternationalizationProvider}
      internationalizationModalsSlot={
        <>
          <LanguageModal />
          <CurrencyModal />
          <CountryModal />
        </>
      }
      productSyncSettingsSlot={<ProductSyncSettings />}
    />
  );
}
