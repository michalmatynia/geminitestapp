import 'server-only';

import {
  encryptSecret,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type { IntegrationRepository } from '@/shared/contracts/integrations/repositories';
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
