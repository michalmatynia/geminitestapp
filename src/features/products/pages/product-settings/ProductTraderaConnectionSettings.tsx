'use client';

import { useCallback, useMemo, type JSX } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  useDefaultTraderaConnection,
  useIntegrationsWithConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpdateDefaultTraderaConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { invalidateListingBadges } from '@/shared/lib/query-invalidation';
import { FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import type { SelectSimpleOption } from '@/shared/ui/forms-and-actions.public';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const ALL_TRADERA_CONNECTIONS_VALUE = '__all_tradera_connections__';
type ProductSettingsToast = ReturnType<typeof useToast>['toast'];
type UpdateDefaultTraderaConnectionMutation = ReturnType<
  typeof useUpdateDefaultTraderaConnection
>;

const buildTraderaConnectionOptions = (
  integrations: IntegrationWithConnections[],
  selectedConnectionId: string | null
): SelectSimpleOption[] => {
  const connectionOptions = integrations
    .filter((integration) => isTraderaIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      integration.connections.map((connection) => ({
        value: connection.id,
        label: connection.name,
        group: integration.name,
        description: connection.hasPlaywrightStorageState === true
          ? 'Browser session saved'
          : 'Browser session not saved',
      }))
    );

  const selectedConnectionExists =
    selectedConnectionId === null ||
    connectionOptions.some((option) => option.value === selectedConnectionId);

  return [
    {
      value: ALL_TRADERA_CONNECTIONS_VALUE,
      label: 'All Tradera connections',
      description: 'Show the best Tradera status across every account.',
    },
    ...connectionOptions,
    ...(selectedConnectionExists
      ? []
      : [
          {
            value: selectedConnectionId,
            label: 'Saved connection not found',
            description: selectedConnectionId,
          },
        ]),
  ];
};

const useTraderaConnectionChangeHandler = ({
  queryClient,
  toast,
  updateDefaultTraderaConnection,
}: {
  queryClient: QueryClient;
  toast: ProductSettingsToast;
  updateDefaultTraderaConnection: UpdateDefaultTraderaConnectionMutation;
}): ((value: string) => void) =>
  useCallback(
    (value: string): void => {
      const connectionId = value === ALL_TRADERA_CONNECTIONS_VALUE ? null : value;
      updateDefaultTraderaConnection
        .mutateAsync({ connectionId })
        .then(async () => {
          await invalidateListingBadges(queryClient);
          toast('Tradera Product List connection updated.', { variant: 'success' });
        })
        .catch((error: unknown) => {
          logClientCatch(error, {
            source: 'ProductTraderaConnectionSettings',
            action: 'updateDefaultTraderaConnection',
          });
          toast('Failed to update Tradera Product List connection.', { variant: 'error' });
        });
    },
    [queryClient, toast, updateDefaultTraderaConnection]
  );

export function ProductTraderaConnectionSettings(): JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const integrationsQuery = useIntegrationsWithConnections();
  const defaultTraderaConnectionQuery = useDefaultTraderaConnection();
  const updateDefaultTraderaConnection = useUpdateDefaultTraderaConnection();

  const selectedConnectionId = defaultTraderaConnectionQuery.data?.connectionId ?? null;
  const selectedValue = selectedConnectionId ?? ALL_TRADERA_CONNECTIONS_VALUE;
  const options = useMemo(
    () => buildTraderaConnectionOptions(integrationsQuery.data ?? [], selectedConnectionId),
    [integrationsQuery.data, selectedConnectionId]
  );
  const hasTraderaConnections = options.length > 1;
  const isLoading = [integrationsQuery.isLoading, defaultTraderaConnectionQuery.isLoading].some(
    Boolean
  );
  const isDisabled = [
    isLoading,
    updateDefaultTraderaConnection.isPending,
    !hasTraderaConnections,
  ].some(Boolean);
  const handleConnectionChange = useTraderaConnectionChangeHandler({
    queryClient,
    toast,
    updateDefaultTraderaConnection,
  });

  return (
    <FormSection
      title='Tradera Product List Statuses'
      description='Choose which Tradera account Product List uses for Tradera listing badges and scoped listing details.'
      className='p-4 space-y-4'
    >
      <FormField
        label='Active Tradera connection'
        description='Switching this changes which Tradera listing statuses are shown in Product List.'
      >
        <SelectSimple
          value={selectedValue}
          onValueChange={handleConnectionChange}
          options={options}
          placeholder={isLoading ? 'Loading Tradera connections...' : 'Select Tradera connection'}
          disabled={isDisabled}
          ariaLabel='Active Tradera Product List connection'
          title='Active Tradera Product List connection'
        />
      </FormField>
      {!hasTraderaConnections ? (
        <Hint>Add a Tradera integration connection before selecting a Product List account.</Hint>
      ) : null}
    </FormSection>
  );
}
