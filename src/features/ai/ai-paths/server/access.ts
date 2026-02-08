import 'server-only';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { auth } from '@/features/auth/server';
import { forbiddenError, authError, rateLimitedError } from '@/shared/errors/app-error';
import type { AiPathRunRecord, AiPathRunStatus } from '@/shared/types/ai-paths';

import type { NextRequest } from 'next/server';

export const AI_PATHS_PERMISSION = 'ai_paths.manage';
const AI_PATHS_RUNNER_PERMISSION = 'products.manage';
const DEV_INTERNAL_TOKEN = 'dev-secret-change-me';

const getInternalToken = (): string | null => {
  if (process.env["AI_PATHS_INTERNAL_TOKEN"]) return process.env["AI_PATHS_INTERNAL_TOKEN"];
  if (process.env["AUTH_SECRET"]) return process.env["AUTH_SECRET"];
  if (process.env["NEXTAUTH_SECRET"]) return process.env["NEXTAUTH_SECRET"];
  if (process.env["NODE_ENV"] === 'development') return DEV_INTERNAL_TOKEN;
  return null;
};

export const isAiPathsInternalRequest = (request: NextRequest): boolean => {
  const token = getInternalToken();
  if (!token) return false;
  const header = request.headers.get('x-ai-paths-internal');
  return Boolean(header && header === token);
};

export type AiPathsAccessContext = {
  userId: string;
  permissions: string[];
  isElevated: boolean;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const RUN_RATE_WINDOW_SECONDS = parseNumber(
  process.env["AI_PATHS_RUN_RATE_LIMIT_WINDOW_SECONDS"],
  60
);
const RUN_RATE_MAX = parseNumber(
  process.env["AI_PATHS_RUN_RATE_LIMIT_MAX"],
  20
);
const RUN_ACTIVE_MAX = parseNumber(
  process.env["AI_PATHS_RUN_ACTIVE_LIMIT"],
  5
);
const ACTION_RATE_WINDOW_SECONDS = parseNumber(
  process.env["AI_PATHS_ACTION_RATE_LIMIT_WINDOW_SECONDS"],
  60
);
const ACTION_RATE_MAX = parseNumber(
  process.env["AI_PATHS_ACTION_RATE_LIMIT_MAX"],
  120
);

const actionBuckets = new Map<string, { count: number; resetAt: number }>();

export const requireAiPathsAccess = async (): Promise<AiPathsAccessContext> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw authError('Unauthorized.');
  }
  const permissions = session.user.permissions ?? [];
  const isElevated = Boolean(session.user.isElevated);
  const hasAccess = isElevated || permissions.includes(AI_PATHS_PERMISSION);
  if (!hasAccess) {
    throw forbiddenError('Forbidden.');
  }
  return {
    userId: session.user.id,
    permissions,
    isElevated,
  };
};

export const requireAiPathsRunAccess = async (): Promise<AiPathsAccessContext> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw authError('Unauthorized.');
  }
  const permissions = session.user.permissions ?? [];
  const isElevated = Boolean(session.user.isElevated);
  const hasAccess =
    isElevated ||
    permissions.includes(AI_PATHS_PERMISSION) ||
    permissions.includes(AI_PATHS_RUNNER_PERMISSION);
  if (!hasAccess) {
    throw forbiddenError('Forbidden.');
  }
  return {
    userId: session.user.id,
    permissions,
    isElevated,
  };
};

export const requireAiPathsAccessOrInternal = async (
  request: NextRequest
): Promise<{ access: AiPathsAccessContext; isInternal: boolean }> => {
  if (isAiPathsInternalRequest(request)) {
    return {
      access: {
        userId: 'system',
        permissions: [AI_PATHS_PERMISSION],
        isElevated: true,
      },
      isInternal: true,
    };
  }
  return {
    access: await requireAiPathsAccess(),
    isInternal: false,
  };
};

export const ensureAiPathsPermission = (
  access: AiPathsAccessContext,
  permission: string,
  message: string = 'Forbidden.'
): void => {
  if (access.isElevated) return;
  if (!access.permissions.includes(permission)) {
    throw forbiddenError(message, { permission });
  }
};

export const canAccessGlobalAiPathRuns = (
  access: AiPathsAccessContext
): boolean => access.isElevated || access.permissions.includes(AI_PATHS_PERMISSION);

export const assertAiPathRunAccess = (
  access: AiPathsAccessContext,
  run: AiPathRunRecord
): void => {
  if (canAccessGlobalAiPathRuns(access)) return;
  if (!run.userId || run.userId !== access.userId) {
    throw forbiddenError('Run access denied.');
  }
};

export const enforceAiPathsRunRateLimit = async (
  access: AiPathsAccessContext
): Promise<void> => {
  const repo = getPathRunRepository();
  const now = Date.now();
  const windowMs = RUN_RATE_WINDOW_SECONDS * 1000;
  const activeStatuses: AiPathRunStatus[] = ['queued', 'running', 'paused'];

  // Run both rate-limit queries in parallel
  const [recent, active] = await Promise.all([
    RUN_RATE_MAX > 0
      ? repo.listRuns({
        userId: access.userId,
        createdAfter: new Date(now - windowMs),
        limit: 1,
        offset: 0,
      })
      : null,
    RUN_ACTIVE_MAX > 0
      ? repo.listRuns({
        userId: access.userId,
        statuses: activeStatuses,
        limit: 1,
        offset: 0,
      })
      : null,
  ]);

  if (recent && recent.total >= RUN_RATE_MAX) {
    throw rateLimitedError(
      'Too many runs queued. Please wait before trying again.',
      windowMs
    );
  }
  if (active && active.total >= RUN_ACTIVE_MAX) {
    throw rateLimitedError(
      'Too many active runs. Wait for one to finish before starting another.',
      windowMs
    );
  }
};

export const enforceAiPathsActionRateLimit = (
  access: AiPathsAccessContext,
  action: string
): void => {
  if (ACTION_RATE_MAX <= 0) return;
  const now = Date.now();
  const windowMs = ACTION_RATE_WINDOW_SECONDS * 1000;
  const key = `${access.userId}:${action}`;
  const bucket = actionBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    actionBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > ACTION_RATE_MAX) {
    const retryAfter = Math.max(bucket.resetAt - now, 1000);
    throw rateLimitedError('Too many requests. Please slow down.', retryAfter, {
      action,
    });
  }
};
