import { NextResponse } from 'next/server';
import { decryptSecret } from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations/session-testing';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { type ConnectionTestContext } from './types';

export const handleLinkedinApiTest = async (
  ctx: ConnectionTestContext
): Promise<Response> => {
  const { connection, steps, pushStep, fail } = ctx;
  pushStep('Checking LinkedIn token', 'pending', 'Validating LinkedIn access token');
  const encryptedToken = connection.linkedinAccessToken?.trim();
  if (!encryptedToken) {
    return fail(
      'Checking LinkedIn token',
      'LinkedIn access token is missing. Authorize LinkedIn in Admin > Integrations.'
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(encryptedToken).trim();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return fail(
      'Checking LinkedIn token',
      'Unable to decrypt LinkedIn access token. Reauthorize LinkedIn in Admin > Integrations.'
    );
  }
  if (!accessToken) {
    return fail('Checking LinkedIn token', 'LinkedIn access token is empty after decryption.');
  }

  const expiresAtValue = connection.linkedinExpiresAt;
  const expiresAt =
    typeof expiresAtValue === 'string'
      ? expiresAtValue.trim()
      : expiresAtValue instanceof Date
        ? expiresAtValue.toISOString()
        : '';
  if (expiresAt) {
    const expiresMs =
      expiresAtValue instanceof Date ? expiresAtValue.getTime() : Date.parse(expiresAt);
    if (!Number.isNaN(expiresMs) && expiresMs < Date.now()) {
      return fail(
        'Checking LinkedIn token',
        `LinkedIn access token expired at ${expiresAt}. Reauthorize LinkedIn in Admin > Integrations.`
      );
    }
  }
  pushStep('Checking LinkedIn token', 'ok', 'Token present and not expired');

  pushStep('Testing LinkedIn API', 'pending', 'Calling LinkedIn /v2/userinfo endpoint');
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      const body = await profileRes.text().catch(() => '');
      return fail(
        'Testing LinkedIn API',
        `LinkedIn API returned ${profileRes.status}: ${body.slice(0, 200)}`
      );
    }
    const profile = (await profileRes.json()) as { sub?: string; name?: string };
    const personUrn =
      connection.linkedinPersonUrn ?? (profile.sub ? `urn:li:person:${profile.sub}` : null);
    const displayName = profile.name ?? personUrn ?? 'Unknown';
    pushStep('Testing LinkedIn API', 'ok', `Authenticated as ${displayName}`);

    const response: TestConnectionResponse = {
      ok: true,
      steps,
      profile: { alias: displayName },
    };
    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return fail('Testing LinkedIn API', message);
  }
};
