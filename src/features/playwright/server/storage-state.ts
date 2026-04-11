import 'server-only';

import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import type { IntegrationRepository } from '@/shared/contracts/integrations/repositories';
import { encryptSecret } from '@/shared/lib/security/encryption';
import type { PersistedStorageState } from './settings';

export const persistPlaywrightConnectionStorageState = async (input: {
  connectionId: string;
  storageState: PersistedStorageState;
  updatedAt: string;
  repo?: Pick<IntegrationRepository, 'updateConnection'>;
}): Promise<void> => {
  const integrationRepository = input.repo ?? (await getIntegrationRepository());
  await integrationRepository.updateConnection(input.connectionId, {
    playwrightStorageState: encryptSecret(JSON.stringify(input.storageState)),
    playwrightStorageStateUpdatedAt: input.updatedAt,
  });
};
