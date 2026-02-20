import type { AiNode } from '@/features/ai/ai-paths/lib';

export type LocalExecutionSecurityIssue = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  reason: string;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hasInlineSecretLikeHttpHeaders = (rawHeaders: unknown): boolean => {
  const headersText = normalizeText(rawHeaders);
  if (!headersText) return false;
  try {
    const parsed = JSON.parse(headersText) as unknown;
    if (!isPlainRecord(parsed)) return false;
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
  } catch {
    // If headers JSON is invalid we do not block here; existing config validation handles this path.
    return false;
  }
};

export const evaluateLocalExecutionSecurity = (
  nodes: AiNode[]
): LocalExecutionSecurityIssue[] => {
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
  });
  return issues;
};
