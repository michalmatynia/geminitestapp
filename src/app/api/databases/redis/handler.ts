import { NextRequest, NextResponse } from 'next/server';

import type { RedisOverviewDto } from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getRedisClient } from '@/shared/lib/redis';

const parsePositiveInt = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const parseInfoValue = (info: string, key: string): string | null => {
  const row = info
    .split('\n')
    .map((line: string) => line.trim())
    .find((line: string) => line.startsWith(`${key}:`));
  if (!row) return null;
  return row.slice(key.length + 1) || null;
};

const getNamespace = (key: string): string => {
  const idx = key.indexOf(':');
  if (idx <= 0) return '(root)';
  return key.slice(0, idx);
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const client = getRedisClient();
  if (!client) {
    const disabled: RedisOverviewDto = {
      enabled: false,
      connected: false,
      urlConfigured: Boolean(process.env['REDIS_URL']),
      dbSize: 0,
      usedMemory: null,
      maxMemory: null,
      namespaces: [],
      sampleKeys: [],
      status: 'disabled',
      version: 'n/a',
      keysCount: 0,
      memoryUsed: '0',
      uptime: '0',
      clients: 0,
    };
    return NextResponse.json(disabled, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { searchParams } = new URL(req.url);
  const limit = parsePositiveInt(searchParams.get('limit'), 200, 20, 2000);
  const count = parsePositiveInt(searchParams.get('count'), 200, 20, 1000);

  let connected: boolean;
  try {
    await client.ping();
    connected = true;
  } catch {
    connected = false;
  }

  const dbSize = connected ? await client.dbsize().catch(() => 0) : 0;
  const memoryInfo = connected ? await client.info('memory').catch(() => '') : '';
  const usedMemory = parseInfoValue(memoryInfo, 'used_memory_human');
  const maxMemory = parseInfoValue(memoryInfo, 'maxmemory_human');

  const keys: string[] = [];
  if (connected) {
    let cursor = '0';
    do {
      const response = await client.scan(cursor, 'COUNT', String(count));
      const batch = response[1] ?? [];
      keys.push(...batch);
      cursor = response[0] ?? '0';
      if (keys.length >= limit) break;
    } while (cursor !== '0');
  }

  const cappedKeys = keys.slice(0, limit);
  const namespaceMap = new Map<string, { keyCount: number; sampleKeys: string[] }>();
  cappedKeys.forEach((key: string) => {
    const namespace = getNamespace(key);
    const current = namespaceMap.get(namespace) ?? { keyCount: 0, sampleKeys: [] };
    current.keyCount += 1;
    if (current.sampleKeys.length < 5) {
      current.sampleKeys.push(key);
    }
    namespaceMap.set(namespace, current);
  });

  const namespaces = Array.from(namespaceMap.entries())
    .map(([namespace, stats]) => ({
      namespace,
      keyCount: stats.keyCount,
      sampleKeys: stats.sampleKeys,
    }))
    .sort((a, b) => b.keyCount - a.keyCount || a.namespace.localeCompare(b.namespace));

  const payload: RedisOverviewDto = {
    enabled: true,
    connected,
    urlConfigured: Boolean(process.env['REDIS_URL']),
    dbSize,
    usedMemory,
    maxMemory,
    namespaces,
    sampleKeys: cappedKeys.slice(0, 25),
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
