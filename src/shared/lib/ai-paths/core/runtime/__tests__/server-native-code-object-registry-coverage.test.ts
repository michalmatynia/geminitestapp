import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

type NodeCodeObjectContractEntry = {
  executionAdapter?: unknown;
  codeObjectId?: unknown;
};

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: vi.fn(async () => ({})),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

import { SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS } from '@/shared/lib/ai-paths/core/runtime/engine-server';

const readNativeContractCodeObjectIds = (): string[] => {
  const contractsPath = path.join(
    process.cwd(),
    'docs',
    'ai-paths',
    'node-code-objects-v3',
    'contracts.json'
  );
  const payload = JSON.parse(readFileSync(contractsPath, 'utf8')) as {
    contracts?: Record<string, NodeCodeObjectContractEntry>;
  };
  const contracts = payload.contracts ?? {};
  return Object.values(contracts)
    .filter(
      (entry: NodeCodeObjectContractEntry): boolean =>
        entry.executionAdapter === 'native_handler_registry' &&
        typeof entry.codeObjectId === 'string'
    )
    .map((entry: NodeCodeObjectContractEntry): string => entry.codeObjectId as string)
    .sort();
};

describe('server native code-object registry coverage', () => {
  it('covers every native contract codeObjectId without drift', () => {
    const nativeContractCodeObjectIds = readNativeContractCodeObjectIds();

    expect(nativeContractCodeObjectIds.length).toBeGreaterThan(0);
    expect(SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS).toEqual(nativeContractCodeObjectIds);
  });
});
