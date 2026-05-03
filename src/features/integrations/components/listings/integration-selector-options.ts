import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';

import { resolveIntegrationDisplayName } from './product-listings-labels';

export const resolveConnectedIntegrations = (
  integrations: IntegrationWithConnections[]
): IntegrationWithConnections[] =>
  integrations.filter(
    (integration: IntegrationWithConnections): boolean =>
      Boolean(integration.id) && integration.connections.some((connection) => Boolean(connection.id))
  );

export const resolveIntegrationOptions = (
  integrations: IntegrationWithConnections[]
): Array<LabeledOptionDto<string>> =>
  integrations.map((integration: IntegrationWithConnections) => ({
    value: integration.id,
    label:
      resolveIntegrationDisplayName(integration.name, integration.slug) ?? integration.name,
  }));

export const resolveConnectionOptions = (
  connections: IntegrationConnectionBasic[]
): Array<LabeledOptionDto<string>> =>
  connections
    .filter((connection: IntegrationConnectionBasic): boolean => Boolean(connection.id))
    .map((connection: IntegrationConnectionBasic) => ({
      value: connection.id,
      label: connection.name,
    }));
