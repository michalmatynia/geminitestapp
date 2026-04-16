import { type AdvancedApiConfig, type RuntimePortValues } from '@/shared/contracts/ai-paths';
import { fetchWithOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';

import { toObject } from './utils';
import { renderTemplate } from '../../utils';

type AuthResolutionContext = {
  config: AdvancedApiConfig;
  nodeInputs: RuntimePortValues;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
};

type AuthResolutionResult = Promise<{
  headers: Record<string, string>;
  queryParams: Record<string, string>;
}>;

const cloneAuthResolutionContext = ({
  headers,
  queryParams,
}: AuthResolutionContext): { headers: Record<string, string>; queryParams: Record<string, string> } => ({
  headers: { ...headers },
  queryParams: { ...queryParams },
});

const resolveNoneAuth = async (context: AuthResolutionContext) => cloneAuthResolutionContext(context);

const resolveApiKeyAuth = async (
  context: AuthResolutionContext
): AuthResolutionResult => {
  const { config, nodeInputs } = context;
  const next = cloneAuthResolutionContext(context);
  const name = (config.apiKeyName ?? '').trim();
  const value = renderTemplate(config.apiKeyValueTemplate ?? '', nodeInputs, '').trim();

  if (!name || !value) {
    return next;
  }

  if ((config.apiKeyPlacement ?? 'header') === 'query') {
    next.queryParams[name] = value;
    return next;
  }

  next.headers[name] = value;
  return next;
};

const resolveBearerAuth = async (
  context: AuthResolutionContext
): AuthResolutionResult => {
  const { config, nodeInputs } = context;
  const next = cloneAuthResolutionContext(context);
  const token = renderTemplate(config.bearerTokenTemplate ?? '', nodeInputs, '').trim();

  if (token) {
    next.headers['Authorization'] = `Bearer ${token}`;
  }

  return next;
};

const resolveBasicAuth = async (
  context: AuthResolutionContext
): AuthResolutionResult => {
  const { config, nodeInputs } = context;
  const next = cloneAuthResolutionContext(context);
  const username = renderTemplate(config.basicUsernameTemplate ?? '', nodeInputs, '');
  const password = renderTemplate(config.basicPasswordTemplate ?? '', nodeInputs, '');
  const token = btoa(`${username}:${password}`);

  next.headers['Authorization'] = `Basic ${token}`;
  return next;
};

const resolveOauthClientCredentialsInput = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues
): {
  clientId: string;
  clientSecret: string;
  scope: string;
  tokenUrl: string;
} => ({
  clientId: renderTemplate(config.oauthClientIdTemplate ?? '', nodeInputs, ''),
  clientSecret: renderTemplate(config.oauthClientSecretTemplate ?? '', nodeInputs, ''),
  scope: renderTemplate(config.oauthScopeTemplate ?? '', nodeInputs, ''),
  tokenUrl: renderTemplate(config.oauthTokenUrl ?? '', nodeInputs, '').trim(),
});

const resolveOauthClientCredentialsAuth = async (
  context: AuthResolutionContext
): AuthResolutionResult => {
  const { config, nodeInputs } = context;
  const next = cloneAuthResolutionContext(context);
  const { clientId, clientSecret, scope, tokenUrl } = resolveOauthClientCredentialsInput(
    config,
    nodeInputs
  );

  if (!tokenUrl || !clientId || !clientSecret) {
    return next;
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
    next.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return next;
};

const resolveConnectionAuth = async (
  context: AuthResolutionContext
): AuthResolutionResult => {
  const { config, nodeInputs } = context;
  const next = cloneAuthResolutionContext(context);
  const connectionHeaderName = (config.connectionHeaderName ?? '').trim() || 'X-Connection-Id';
  const connectionId = renderTemplate(config.connectionIdTemplate ?? '', nodeInputs, '').trim();

  if (connectionId) {
    next.headers[connectionHeaderName] = connectionId;
  }

  return next;
};

const AUTH_MODE_RESOLVERS = {
  api_key: resolveApiKeyAuth,
  basic: resolveBasicAuth,
  bearer: resolveBearerAuth,
  connection: resolveConnectionAuth,
  none: resolveNoneAuth,
  oauth2_client_credentials: resolveOauthClientCredentialsAuth,
} as const;

export const resolveAuthHeaders = async (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  headers: Record<string, string>,
  queryParams: Record<string, string>
): Promise<{ headers: Record<string, string>; queryParams: Record<string, string> }> => {
  const authMode = config.authMode ?? 'none';
  const resolver = AUTH_MODE_RESOLVERS[authMode] ?? resolveNoneAuth;

  return resolver({
    config,
    headers,
    nodeInputs,
    queryParams,
  });
};
