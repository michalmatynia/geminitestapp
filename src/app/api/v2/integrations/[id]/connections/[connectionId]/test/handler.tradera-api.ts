import { NextResponse } from 'next/server';
import { decryptSecret } from '@/features/integrations/server';
import { getTraderaUserInfo } from '@/features/integrations/services/tradera-api-client';
import type { IntegrationConnectionRecord, IntegrationRepository } from '@/shared/contracts/integrations/repositories';
import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations/session-testing';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { type ConnectionTestContext } from './types';

export const handleTraderaApiTest = async (
  ctx: ConnectionTestContext
): Promise<Response> => {
  const { connection, repo, manualMode, steps, pushStep, fail } = ctx;
  if (manualMode) {
    pushStep('Manual mode', 'ok', 'Manual login mode does not apply to Tradera API connections.');
  }

  pushStep('Decrypting credentials', 'pending', 'Validating Tradera API credentials');
  const appId = toPositiveInt(connection.traderaApiAppId);
  const userId = toPositiveInt(connection.traderaApiUserId);
  const encryptedAppKey = connection.traderaApiAppKey;
  const encryptedToken = connection.traderaApiToken;

  if (!appId) {
    return fail(
      'Decrypting credentials',
      'Tradera API App ID is missing. Update the connection first.'
    );
  }
  if (!userId) {
    return fail(
      'Decrypting credentials',
      'Tradera API User ID is missing. Update the connection first.'
    );
  }
  if (!encryptedAppKey) {
    return fail(
      'Decrypting credentials',
      'Tradera API App Key is missing. Update the connection first. Password fallback is disabled.'
    );
  }
  if (!encryptedToken) {
    return fail(
      'Decrypting credentials',
      'Tradera API token is missing. Update the connection first. Password fallback is disabled.'
    );
  }

  let appKey: string;
  let token: string;
  try {
    appKey = decryptSecret(encryptedAppKey).trim();
    token = decryptSecret(encryptedToken).trim();
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return fail(
      'Decrypting credentials',
      `Unable to decrypt Tradera API credentials: ${message}`
    );
  }
  if (!appKey || !token) {
    return fail('Decrypting credentials', 'Tradera API credentials are empty after decryption.');
  }
  pushStep('Decrypting credentials', 'ok', 'Tradera API credentials decrypted');

  pushStep('Testing API connection', 'pending', 'Calling RestrictedService.GetUserInfo');
  try {
    const profile = await getTraderaUserInfo({
      appId,
      appKey,
      userId,
      token,
      sandbox: connection.traderaApiSandbox ?? false,
    });
    await repo.updateConnection(connection.id, {
      traderaApiTokenUpdatedAt: new Date(),
    });
    pushStep(
      'Testing API connection',
      'ok',
      profile.alias
        ? `Authenticated as ${profile.alias}.`
        : `Authenticated as user ${profile.userId}.`
    );
    const response: TestConnectionResponse = {
      ok: true,
      steps,
      profile,
    };

    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return fail('Testing API connection', message);
  }
};
