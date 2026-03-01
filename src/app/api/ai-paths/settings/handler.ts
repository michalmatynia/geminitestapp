import { type NextRequest, NextResponse } from 'next/server';

import { listAiPathsSettings } from '@/features/ai/ai-paths/services/ai-paths-settings-service';
import { type ApiHandlerContext } from '@/shared/lib/api/api-handler';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const parseRequestedKeys = (req: NextRequest): string[] => {
  const { searchParams } = new URL(req.url);
  const keysStr = searchParams.get('keys') ?? '';
  const raw = keysStr
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(raw));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestedKeys = parseRequestedKeys(req);
  const startedAt = Date.now();
  const settings =
    requestedKeys.length > 0 ? await listAiPathsSettings(requestedKeys) : await listAiPathsSettings();
  const durationMs = Date.now() - startedAt;
  const payloadBytes = settings.reduce((sum, item) => sum + item.key.length + item.value.length, 0);

  if (durationMs >= 250 || requestedKeys.length > 0) {
    void logSystemEvent({
      level: 'info',
      message: '[ai-paths-settings-api] GET /api/ai-paths/settings',
      source: 'ai-paths-settings-api',
      context: {
        durationMs,
        recordCount: settings.length,
        payloadBytes,
        requestedKeys: requestedKeys.length,
      },
    });
  }

  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}
