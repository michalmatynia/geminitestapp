import {
  useIntegrationsActions,
  useIntegrationsApiConsole,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import type { ApiPreset } from '@/shared/contracts/ui/api';
import type { IntegrationAllegroApiMethod } from '@/shared/contracts/integrations/api';
import { GenericApiConsole } from '@/shared/ui/templates.public';

const ALLEGRO_API_PRESETS: ApiPreset[] = [
  { label: 'Categories', method: 'GET', path: '/sale/categories' },
  { label: 'Offers', method: 'GET', path: '/sale/offers?limit=10' },
  { label: 'Offer Events', method: 'GET', path: '/sale/offer-events?limit=10' },
  { label: 'Checkout Forms', method: 'GET', path: '/order/checkout-forms?limit=10' },
  { label: 'Shipping Rates', method: 'GET', path: '/sale/shipping-rates' },
  { label: 'Return Policies', method: 'GET', path: '/after-sales-service-returns' },
  { label: 'Implied Warranties', method: 'GET', path: '/after-sales-service-conditions' },
];

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

  const activeConnection = connections[0] ?? null;
  const isConnected = activeConnection?.hasAllegroAccessToken === true;

  const baseUrl = (activeConnection?.allegroUseSandbox === true)
    ? 'https://api.allegro.pl.allegrosandbox.pl'
    : 'https://api.allegro.pl';

  const response = allegroApiResponse !== null ? {
    status: allegroApiResponse.status,
    statusText: allegroApiResponse.statusText,
    data: allegroApiResponse.data,
    ...(allegroApiResponse.refreshed !== undefined && {
      refreshed: allegroApiResponse.refreshed,
    }),
  } : null;

  return (
    <GenericApiConsole
      config={{
        title: 'Allegro API Console',
        description: 'Send requests using the active Allegro connection token.',
        baseUrl,
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
        response,
      }}
      presets={ALLEGRO_API_PRESETS}
      isConnected={isConnected}
      onSetMethod={(value) => {
        setAllegroApiMethod(value as IntegrationAllegroApiMethod);
      }}
      onSetPath={setAllegroApiPath}
      onSetBodyOrParams={setAllegroApiBody}
      onRequest={() => {
        void handleAllegroApiRequest();
      }}
    />
  );
}
