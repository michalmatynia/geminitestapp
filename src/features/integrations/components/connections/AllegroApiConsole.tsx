"use client";

import { IntegrationConnection } from "@/features/integrations/types/integrations-ui";
import { ApiConsole, type ApiPreset } from "./ApiConsole";

type AllegroApiConsoleProps = {
  activeConnection: IntegrationConnection | null;
  method: string;
  setMethod: (value: string) => void;
  path: string;
  setPath: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  loading: boolean;
  error: string | null;
  response: {
    status: number;
    statusText: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
  onRequest: () => void;
  isConnected: boolean;
};

export function AllegroApiConsole({
  activeConnection,
  method,
  setMethod,
  path,
  setPath,
  body,
  setBody,
  loading,
  error,
  response,
  onRequest,
  isConnected,
}: AllegroApiConsoleProps): React.JSX.Element {
  const allegroApiPresets: ApiPreset[] = [
    { label: "Categories", method: "GET", path: "/sale/categories" },
    { label: "Offers", method: "GET", path: "/sale/offers?limit=10" },
    { label: "Offer Events", method: "GET", path: "/sale/offer-events?limit=10" },
    { label: "Checkout Forms", method: "GET", path: "/order/checkout-forms?limit=10" },
    { label: "Shipping Rates", method: "GET", path: "/sale/shipping-rates" },
    { label: "Return Policies", method: "GET", path: "/after-sales-service-returns" },
    { label: "Implied Warranties", method: "GET", path: "/after-sales-service-conditions" },
  ];

  return (
    <ApiConsole
      title="Allegro API Console"
      description="Send requests using the active Allegro connection token."
      presets={allegroApiPresets}
      method={method}
      setMethod={setMethod}
      path={path}
      setPath={setPath}
      bodyOrParams={body}
      setBodyOrParams={setBody}
      bodyOrParamsLabel="JSON body"
      loading={loading}
      error={error}
      response={response}
      onRequest={onRequest}
      isConnected={isConnected}
      connectionWarning="Connect Allegro to enable API requests."
      baseUrl={activeConnection?.allegroUseSandbox
        ? "https://api.allegro.pl.allegrosandbox.pl"
        : "https://api.allegro.pl"}
      methodType="select"
    />
  );
}
