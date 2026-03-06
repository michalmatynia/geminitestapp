'use client';

import {
  useIntegrationsActions,
  useIntegrationsApiConsole,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import { GenericApiConsole, type ApiPreset } from '@/shared/ui';

export function AllegroApiConsole(): React.JSX.Element {
  const { connections } = useIntegrationsData();
  const {
    allegroApiMethod,
    setAllegroApiMethod,
    allegroApiPath,
    setAllegroApiPath,
    allegroApiBody,
    setAllegroApiBody,
    allegroApiLoading,
    allegroApiError,
    allegroApiResponse,
  } = useIntegrationsApiConsole();
  const { handleAllegroApiRequest } = useIntegrationsActions();

  const activeConnection = connections[0] || null;
  const isConnected = Boolean(activeConnection?.hasAllegroAccessToken);

  const allegroApiPresets: ApiPreset[] = [
    { label: 'Categories', method: 'GET', path: '/sale/categories' },
    { label: 'Offers', method: 'GET', path: '/sale/offers?limit=10' },
    { label: 'Offer Events', method: 'GET', path: '/sale/offer-events?limit=10' },
    { label: 'Checkout Forms', method: 'GET', path: '/order/checkout-forms?limit=10' },
    { label: 'Shipping Rates', method: 'GET', path: '/sale/shipping-rates' },
    { label: 'Return Policies', method: 'GET', path: '/after-sales-service-returns' },
    { label: 'Implied Warranties', method: 'GET', path: '/after-sales-service-conditions' },
  ];

  return (
    <GenericApiConsole
      config={{
        title: 'Allegro API Console',
        description: 'Send requests using the active Allegro connection token.',
        baseUrl: activeConnection?.allegroUseSandbox
          ? 'https://api.allegro.pl.allegrosandbox.pl'
          : 'https://api.allegro.pl',
        methodType: 'select',
        bodyOrParamsLabel: 'JSON body',
        connectionWarning: 'Connect Allegro to enable API requests.',
      }}
      state={{
        method: allegroApiMethod,
        path: allegroApiPath,
        bodyOrParams: allegroApiBody,
        loading: allegroApiLoading,
        error: allegroApiError,
        response: allegroApiResponse
          ? {
            status: allegroApiResponse.status,
            statusText: allegroApiResponse.statusText,
            data: allegroApiResponse.data,
            ...(allegroApiResponse.refreshed !== undefined && {
              refreshed: allegroApiResponse.refreshed,
            }),
          }
          : null,
      }}
      presets={allegroApiPresets}
      isConnected={isConnected}
      onSetMethod={setAllegroApiMethod}
      onSetPath={setAllegroApiPath}
      onSetBodyOrParams={setAllegroApiBody}
      onRequest={() => {
        void handleAllegroApiRequest();
      }}
    />
  );
}
