 
 
 

import { AdvancedApiConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import { renderTemplate } from '../../utils';
import { fetchWithOutboundUrlPolicy } from '../../security/outbound-url-policy';
import { toObject } from './utils';

export const resolveAuthHeaders = async (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  headers: Record<string, string>,
  queryParams: Record<string, string>
): Promise<{ headers: Record<string, string>; queryParams: Record<string, string> }> => {
  const authMode = config.authMode ?? 'none';
  const nextHeaders = { ...headers };
  const nextQueryParams = { ...queryParams };

  if (authMode === 'none') {
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'api_key') {
    const name = (config.apiKeyName ?? '').trim();
    const value = renderTemplate(config.apiKeyValueTemplate ?? '', nodeInputs, '').trim();
    if (name && value) {
      if ((config.apiKeyPlacement ?? 'header') === 'query') {
        nextQueryParams[name] = value;
      } else {
        nextHeaders[name] = value;
      }
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'bearer') {
    const token = renderTemplate(config.bearerTokenTemplate ?? '', nodeInputs, '').trim();
    if (token) {
      nextHeaders['Authorization'] = `Bearer ${token}`;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'basic') {
    const username = renderTemplate(config.basicUsernameTemplate ?? '', nodeInputs, '');
    const password = renderTemplate(config.basicPasswordTemplate ?? '', nodeInputs, '');
    const token = btoa(`${username}:${password}`);
    nextHeaders['Authorization'] = `Basic ${token}`;
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'oauth2_client_credentials') {
    const tokenUrl = renderTemplate(config.oauthTokenUrl ?? '', nodeInputs, '').trim();
    const clientId = renderTemplate(config.oauthClientIdTemplate ?? '', nodeInputs, '');
    const clientSecret = renderTemplate(config.oauthClientSecretTemplate ?? '', nodeInputs, '');
    const scope = renderTemplate(config.oauthScopeTemplate ?? '', nodeInputs, '');
    if (!tokenUrl || !clientId || !clientSecret) {
      return { headers: nextHeaders, queryParams: nextQueryParams };
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      ...(scope.trim() ? { scope } : {}),
    });
    const tokenResponse = await fetchWithOutboundUrlPolicy(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      maxRedirects: 3,
    });
    const tokenPayload = toObject(await tokenResponse.json().catch(() => ({})));
    const accessToken = String(tokenPayload['access_token'] ?? '').trim();
    if (accessToken) {
      nextHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  if (authMode === 'connection') {
    const connectionHeaderName = (config.connectionHeaderName ?? '').trim() || 'X-Connection-Id';
    const connectionId = renderTemplate(config.connectionIdTemplate ?? '', nodeInputs, '').trim();
    if (connectionId) {
      nextHeaders[connectionHeaderName] = connectionId;
    }
    return { headers: nextHeaders, queryParams: nextQueryParams };
  }

  return { headers: nextHeaders, queryParams: nextQueryParams };
};
