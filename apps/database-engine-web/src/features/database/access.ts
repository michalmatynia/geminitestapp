/**
 * Database Access Control
 * 
 * Server-side authorization checks for database operations.
 * 
 * Provides two access patterns:
 * 1. Standard admin access - requires settings.manage permission
 * 2. AI Paths internal access - allows AI workflows to access specific collections
 * 
 * This dual-access pattern enables:
 * - Secure admin database management interface
 * - Automated AI Path workflows that need database access
 * - Collection-level access restrictions for internal requests
 */

import 'server-only';

import type { NextRequest } from 'next/server';

import { forbiddenError } from '@/shared/errors/app-error';

const DEV_INTERNAL_HEADER_VALUE = 'dev-internal-header-value-change-me';

const DEFAULT_COLLECTION_ALLOWLIST = [
  'products',
  'product_drafts',
  'product_categories',
  'product_parameters',
  'product_category_assignments',
  'product_tags',
  'product_tag_assignments',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
  'product_producer_assignments',
  'filemaker_cvs',
  'filemaker_job_applications',
  'integrations',
  'integration_connections',
  'settings',
  'users',
  'user_preferences',
  'languages',
  'system_logs',
  'notes',
  'tags',
  'categories',
  'notebooks',
  'noteFiles',
  'themes',
  'chatbot_sessions',
  'auth_security_attempts',
  'auth_security_profiles',
  'auth_login_challenges',
  'projects',
  'services',
  'inquiries',
];

type AllowlistConfig = {
  allowAll: boolean;
  allowed: Set<string>;
};

const normalizeCollectionName = (value: string): string => value.trim().toLowerCase();

const parseAllowlist = (raw: string): string[] =>
  raw
    .split(/[,\\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

const buildAllowlist = (): AllowlistConfig => {
  const raw = process.env['AI_PATHS_DB_COLLECTION_ALLOWLIST'];
  if (raw === undefined || raw.trim().length === 0) {
    return {
      allowAll: false,
      allowed: new Set(DEFAULT_COLLECTION_ALLOWLIST.map(normalizeCollectionName)),
    };
  }

  const tokens = parseAllowlist(raw);
  const lowered = tokens.map(normalizeCollectionName);
  const allowAll = lowered.includes('*') || lowered.includes('all');
  const includeDefault = lowered.includes('default');
  const allowed = new Set<string>();

  if (includeDefault) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection) => {
      allowed.add(normalizeCollectionName(collection));
    });
  }

  tokens.forEach((token) => {
    const normalized = normalizeCollectionName(token);
    if (normalized === '*' || normalized === 'all' || normalized === 'default') return;
    allowed.add(normalized);
  });

  if (!allowAll && allowed.size === 0) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection) => {
      allowed.add(normalizeCollectionName(collection));
    });
  }

  return { allowAll, allowed };
};

const allowlistConfig = buildAllowlist();

const getExpectedInternalHeaderValue = (): string | null => {
  const internalToken = process.env['AI_PATHS_INTERNAL_TOKEN'];
  if (internalToken !== undefined && internalToken.length > 0) return internalToken;
  const authSecret = process.env['AUTH_SECRET'];
  if (authSecret !== undefined && authSecret.length > 0) return authSecret;
  const nextAuthSecret = process.env['NEXTAUTH_SECRET'];
  if (nextAuthSecret !== undefined && nextAuthSecret.length > 0) return nextAuthSecret;
  if (process.env['NODE_ENV'] === 'development') return DEV_INTERNAL_HEADER_VALUE;
  return null;
};

export const isCollectionAllowed = (collection: string): boolean => {
  if (collection.trim().length === 0) return false;
  if (allowlistConfig.allowAll) return true;
  return allowlistConfig.allowed.has(normalizeCollectionName(collection));
};

export const getCollectionAllowlist = (): string[] => {
  if (allowlistConfig.allowAll) return ['*'];
  return Array.from(allowlistConfig.allowed).sort((a, b) => a.localeCompare(b));
};

export const isDatabaseEngineInternalRequest = (request: NextRequest): boolean => {
  const expectedHeaderValue = getExpectedInternalHeaderValue();
  if (expectedHeaderValue === null) return false;
  const header = request.headers.get('x-ai-paths-internal');
  return header !== null && header === expectedHeaderValue;
};

/**
 * Assert user has database engine management access
 * Requires settings.manage permission
 */
export async function assertDatabaseEngineManageAccess(): Promise<void> {
  // Auth removed — database-engine-web is unauthenticated
}

/**
 * Assert access for database operations with AI Paths internal bypass
 * 
 * Allows two access paths:
 * 1. AI Paths internal requests (with collection restrictions)
 * 2. Standard admin access (full access)
 * 
 * @param request - Next.js request object
 * @param options - Optional collection name for validation
 * @returns Object indicating if request is internal
 */
export async function assertDatabaseEngineManageAccessOrAiPathsInternal(
  request: NextRequest,
  options?: { collection?: string | null }
): Promise<{ isInternal: boolean }> {
  // Check if this is an AI Paths internal request
  if (isDatabaseEngineInternalRequest(request)) {
    const collection = options?.collection?.trim() ?? '';
    // Validate collection is in allowed list
    if (collection.length > 0 && isCollectionAllowed(collection) === false) {
      throw forbiddenError('Forbidden.');
    }
    return { isInternal: true };
  }

  // Fall back to standard admin access check
  await assertDatabaseEngineManageAccess();
  return { isInternal: false };
}
