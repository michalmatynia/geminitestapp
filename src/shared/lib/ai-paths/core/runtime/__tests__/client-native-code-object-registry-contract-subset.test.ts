import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
} from '@/shared/lib/ai-paths/core/runtime/engine-client';

type NodeCodeObjectContractEntry = {
  executionAdapter?: unknown;
  codeObjectId?: unknown;
};

const readNativeContractCodeObjectIdSet = (): Set<string> => {
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
  const ids = Object.values(contracts)
    .filter(
      (entry: NodeCodeObjectContractEntry): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map((entry: NodeCodeObjectContractEntry): string => entry.codeObjectId as string);
  return new Set(ids);
};

const readNativeContractCodeObjectIdByNodeType = (): Map<string, string> => {
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
  const entries = Object.entries(contracts)
    .filter(
      ([, entry]: [string, NodeCodeObjectContractEntry]): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map(([nodeType, entry]: [string, NodeCodeObjectContractEntry]): [string, string] => [
      nodeType,
      entry.codeObjectId as string,
    ]);
  return new Map(entries);
};

const buildPromptNode = (): AiNode => ({
  id: 'node-prompt',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: [],
  outputs: ['prompt'],
  config: {
    prompt: {
      template: 'client-unsupported',
    },
  },
  position: { x: 0, y: 0 },
});

describe('client native code-object registry contract subset', () => {
  it('only contains codeObjectIds that exist in native contracts', () => {
    const nativeContractIds = readNativeContractCodeObjectIdSet();

    expect(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.length).toBeGreaterThan(0);
    CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.forEach((codeObjectId: string) => {
      expect(nativeContractIds.has(codeObjectId)).toBe(true);
    });
  });

  it('covers all client-supported pilot node types with native mappings', () => {
    const byNodeType = readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);
    const missingNodeTypes = CLIENT_LEGACY_HANDLER_NODE_TYPES.filter((nodeType: string): boolean => {
      const contractCodeObjectId = byNodeType.get(nodeType);
      if (!contractCodeObjectId) return false;
      return !clientNativeIdSet.has(contractCodeObjectId);
    });

    expect(missingNodeTypes).toEqual([]);
  });

  it('keeps unsupported server-only nodes blocked in client execution', async () => {
    await expect(
      evaluateGraphClient({
        nodes: [buildPromptNode()],
        edges: [],
        runtimeKernelPilotNodeTypes: ['prompt'],
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow(`Node type 'prompt' is not supported in client-side execution. Use Server execution.`);
  });
});
