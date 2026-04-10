import 'server-only';

import {
  encryptSecret,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type { PersistedStorageState } from '@/features/integrations/services/tradera-playwright-settings';

export const persistPlaywrightConnectionStorageState = async (input: {
  connectionId: string;
  storageState: PersistedStorageState;
  updatedAt: string;
}): Promise<void> => {
  const integrationRepository = await getIntegrationRepository();
  await integrationRepository.updateConnection(input.connectionId, {
    playwrightStorageState: encryptSecret(JSON.stringify(input.storageState)),
    playwrightStorageStateUpdatedAt: input.updatedAt,
  });
};
