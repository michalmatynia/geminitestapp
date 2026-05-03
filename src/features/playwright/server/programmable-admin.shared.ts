import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';
import { badRequestError } from '@/shared/errors/app-error';
import { parseAndValidatePlaywrightActionsSettingValue } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';

import {
  requirePlaywrightProgrammableConnectionById,
  requirePlaywrightProgrammableIntegrationById,
} from './programmable-storage';

export const upsertPlaywrightActionsSetting = async (value: string): Promise<void> => {
  const validated = parseAndValidatePlaywrightActionsSettingValue(value);
  if (!validated.ok) {
    throw badRequestError(validated.error);
  }

  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection('settings').updateOne(
    { key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY },
    {
      $set: {
        value: encodeSettingValue(PLAYWRIGHT_ACTIONS_SETTINGS_KEY, validated.value),
        updatedAt: now,
      },
      $setOnInsert: {
        key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        createdAt: now,
      },
    },
    { upsert: true }
  );
  clearSettingsCache();
};

export const requireConnectionId = (id: string): string => {
  if (id.length === 0) {
    throw badRequestError('Connection id is required');
  }
  return id;
};

export const requireIntegrationId = (id: string): string => {
  if (id.length === 0) {
    throw badRequestError('Integration id is required');
  }
  return id;
};

export const requireProgrammableConnection = async (
  connectionId: string,
  errorMessage: string
): Promise<IntegrationConnectionRecord> => {
  const result = await requirePlaywrightProgrammableConnectionById({
    connectionId,
    errorMessage,
  });
  return result.connection;
};

export const assertProgrammableIntegration = async (
  integrationId: string,
  errorMessage: string
): Promise<void> => {
  await requirePlaywrightProgrammableIntegrationById({
    integrationId,
    errorMessage,
  });
};

export const buildDefaultListingSampleInput = (): Record<string, unknown> => {
  const product = {
    id: 'sample-product',
    sku: 'PW-SAMPLE-001',
    name: { en: 'Programmable Playwright Sample Product' },
    description: { en: 'Sample payload for testing a programmable marketplace listing script.' },
    price: 49.99,
    images: [
      'https://images.example.com/products/playwright-sample-1.jpg',
      'https://images.example.com/products/playwright-sample-2.jpg',
    ],
  };

  return {
    title: 'Programmable Playwright Sample Product',
    description: 'Sample payload for testing a programmable marketplace listing script.',
    price: 49.99,
    images: product.images,
    imageUrls: product.images,
    sku: product.sku,
    bundle: product,
    product,
    entityJson: JSON.stringify(product),
  };
};
