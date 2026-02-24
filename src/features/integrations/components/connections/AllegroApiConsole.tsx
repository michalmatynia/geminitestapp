'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';

import { ApiConsole } from './ApiConsole';
import { ApiConsoleProvider, type ApiPreset } from './ApiConsoleContext';

export function AllegroApiConsole(): React.JSX.Element {
  const {
    connections,
    allegroApiMethod,
    setAllegroApiMethod,
    allegroApiPath,
    setAllegroApiPath,
    allegroApiBody,
    setAllegroApiBody,
    allegroApiLoading,
    allegroApiError,
    allegroApiResponse,
    handleAllegroApiRequest,
  } = useIntegrationsContext();

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
    <ApiConsoleProvider
      value={{
        method: allegroApiMethod,
        setMethod: setAllegroApiMethod,
        path: allegroApiPath,
        setPath: setAllegroApiPath,
        bodyOrParams: allegroApiBody,
        setBodyOrParams: setAllegroApiBody,
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
        onRequest: () => { void handleAllegroApiRequest(); },
        isConnected,
      }}
    >
      <ApiConsole
        title='Allegro API Console'
        description='Send requests using the active Allegro connection token.'
        presets={allegroApiPresets}
        bodyOrParamsLabel='JSON body'
        connectionWarning='Connect Allegro to enable API requests.'
        baseUrl={activeConnection?.allegroUseSandbox
          ? 'https://api.allegro.pl.allegrosandbox.pl'
          : 'https://api.allegro.pl'}
        methodType='select'
      />
    </ApiConsoleProvider>
  );
}
