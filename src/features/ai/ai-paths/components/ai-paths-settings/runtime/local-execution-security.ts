import type { AiNode } from '@/shared/contracts/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type LocalExecutionSecurityIssue = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  reason: string;
};

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const hasInlineSecretLikeHttpHeaders = (rawHeaders: unknown): boolean => {
  const headersText = normalizeText(rawHeaders);
  if (!headersText) return false;
  try {
    const parsed = JSON.parse(headersText) as unknown;
    if (!isObjectRecord(parsed)) return false;
    return Object.entries(parsed).some(([key, value]) => {
      const normalizedKey = key.trim().toLowerCase();
      if (
        normalizedKey !== 'authorization' &&
        normalizedKey !== 'x-api-key' &&
        normalizedKey !== 'api-key' &&
        normalizedKey !== 'x-auth-token'
      ) {
        return false;
      }
      return normalizeText(value).length > 0;
    });
  } catch (error) {
    logClientError(error);
    // If headers JSON is invalid we do not block here; existing config validation handles this path.
    return false;
  }
};

const hasPlaywrightProxyPassword = (value: unknown): boolean => {
  if (!isObjectRecord(value)) return false;
  const proxy = value['proxy'];
  if (!isObjectRecord(proxy)) return false;
  return normalizeText(proxy['password']).length > 0;
};

const hasPlaywrightHttpCredentials = (value: unknown): boolean => {
  if (!isObjectRecord(value)) return false;
  const httpCredentials = value['httpCredentials'];
  if (!isObjectRecord(httpCredentials)) return false;
  return normalizeText(httpCredentials['password']).length > 0;
};

const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return isObjectRecord(parsed) ? parsed : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const evaluateLocalExecutionSecurity = (nodes: AiNode[]): LocalExecutionSecurityIssue[] => {
  const issues: LocalExecutionSecurityIssue[] = [];
  nodes.forEach((node: AiNode): void => {
    const nodeTitle = node.title ?? node.id;
    if (node.type === 'api_advanced') {
      const config = (node.config?.apiAdvanced ?? {}) as Record<string, unknown>;
      const authMode = normalizeText(config['authMode']) || 'none';
      if (authMode === 'api_key' && normalizeText(config['apiKeyValueTemplate']).length > 0) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'API key template is configured directly in node settings.',
        });
      }
      if (authMode === 'bearer' && normalizeText(config['bearerTokenTemplate']).length > 0) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'Bearer token template is configured directly in node settings.',
        });
      }
      if (
        authMode === 'basic' &&
        (normalizeText(config['basicUsernameTemplate']).length > 0 ||
          normalizeText(config['basicPasswordTemplate']).length > 0)
      ) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'Basic auth credentials are configured directly in node settings.',
        });
      }
      if (
        authMode === 'oauth2_client_credentials' &&
        (normalizeText(config['oauthClientIdTemplate']).length > 0 ||
          normalizeText(config['oauthClientSecretTemplate']).length > 0)
      ) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'OAuth client credentials are configured directly in node settings.',
        });
      }
    }
    if (node.type === 'http') {
      const headers = node.config?.http?.headers;
      if (hasInlineSecretLikeHttpHeaders(headers)) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'HTTP headers include inline authorization or API key values.',
        });
      }
    }
    if (node.type === 'playwright') {
      const config = (node.config?.playwright ?? {}) as Record<string, unknown>;
      const settingsOverrides = config['settingsOverrides'];
      if (
        isObjectRecord(settingsOverrides) &&
        normalizeText(settingsOverrides['proxyPassword']).length > 0
      ) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'Playwright settingsOverrides include proxyPassword directly in node settings.',
        });
      }

      const launchOptions = parseJsonRecord(config['launchOptionsJson']);
      if (launchOptions && hasPlaywrightProxyPassword(launchOptions)) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'Playwright launch options include inline proxy password credentials.',
        });
      }

      const contextOptions = parseJsonRecord(config['contextOptionsJson']);
      if (contextOptions && hasPlaywrightHttpCredentials(contextOptions)) {
        issues.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle,
          reason: 'Playwright context options include inline HTTP credentials password.',
        });
      }
    }
  });
  return issues;
};
