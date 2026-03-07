import { describe, expect, it } from 'vitest';

import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { repairPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils';

import {
  buildPortablePathPackage,
  resolvePortablePathInputAsync,
  validatePortablePathConfig,
} from '../index';
import { runPortablePathServer } from '../server';

const buildCrossPageKernelPath = (): PathConfig => {
  const base = createDefaultPathConfig('path_portable_cross_page_kernel_transfer');
  const nodes: AiNode[] = [
    {
      id: 'node-constant',
      type: 'constant',
      title: 'Constant',
      description: '',
      inputs: [],
      outputs: ['value'],
      config: {
        constant: {
          valueType: 'number',
          value: 7,
        },
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node-math',
      type: 'math',
      title: 'Math',
      description: '',
      inputs: ['value'],
      outputs: ['value'],
      config: {
        math: {
          operation: 'add',
          operand: 5,
        },
      },
      position: { x: 200, y: 0 },
    },
    {
      id: 'node-template',
      type: 'template',
      title: 'Template',
      description: '',
      inputs: ['value'],
      outputs: ['prompt'],
      config: {
        template: {
          template: 'sum={{value}}',
        },
      },
      position: { x: 400, y: 0 },
    },
  ];
  const edges: Edge[] = [
    {
      id: 'edge-constant-math',
      from: 'node-constant',
      to: 'node-math',
      fromPort: 'value',
      toPort: 'value',
    },
    {
      id: 'edge-math-template',
      from: 'node-math',
      to: 'node-template',
      fromPort: 'value',
      toPort: 'value',
    },
  ];
  return {
    ...base,
    name: 'Cross Page Kernel Transfer',
    description: 'Portable envelope transfer parity across AI-Paths pages.',
    nodes,
    edges,
    aiPathsValidation: {
      ...(base.aiPathsValidation ?? {}),
      policy: 'warn_below_threshold',
      warnThreshold: 93,
      blockThreshold: 41,
      docsSources: ['products.page', 'admin.ai-paths.canvas'],
    },
  };
};

describe('portable AI-path cross-page portability', () => {
  it('preserves runtime behavior and validation policy when a portable package is imported on another page', async () => {
    const pathConfig = buildCrossPageKernelPath();
    const repairedPath = repairPathNodeIdentities(pathConfig, {
      palette,
    });
    expect(repairedPath.changed).toBe(true);

    const sourceValidation = validatePortablePathConfig(repairedPath.config, {
      mode: 'strict',
    });
    expect(sourceValidation.ok).toBe(false);

    const portablePackage = buildPortablePathPackage(repairedPath.config, {
      createdAt: '2026-03-06T00:00:00.000Z',
      metadata: {
        sourcePage: 'products.detail',
        targetPage: 'admin.ai-paths.canvas',
      },
    });
    expect(portablePackage.kind).toBe('path_package');
    expect(portablePackage.document.kind).toBe('canvas');
    const transferredPackagePayload = JSON.stringify(portablePackage);

    const imported = await resolvePortablePathInputAsync(transferredPackagePayload);
    if (!imported.ok) {
      throw new Error(imported.error);
    }
    expect(imported.ok).toBe(true);

    expect(imported.value.source).toBe('portable_package');
    expect(imported.value.portablePackage.metadata).toMatchObject({
      sourcePage: 'products.detail',
      targetPage: 'admin.ai-paths.canvas',
    });
    expect(imported.value.pathConfig.aiPathsValidation).toMatchObject({
      policy: 'warn_below_threshold',
      warnThreshold: 93,
      blockThreshold: 41,
      docsSources: ['products.page', 'admin.ai-paths.canvas'],
    });

    const importedValidation = validatePortablePathConfig(imported.value.pathConfig, {
      mode: 'strict',
    });
    expect(importedValidation.ok).toBe(true);
    expect(importedValidation.compileReport.ok).toBe(sourceValidation.compileReport.ok);
    expect(importedValidation.preflightReport?.blockReason).toBe(
      sourceValidation.preflightReport?.blockReason
    );
    expect(importedValidation.preflightReport?.blocked ?? false).toBe(
      sourceValidation.preflightReport?.blocked ?? false
    );
    const templateNodeId = repairedPath.config.nodes.find((node) => node.type === 'template')?.id;
    expect(typeof templateNodeId).toBe('string');

    const sourceRuntimeState = await evaluateGraphServer({
      nodes: repairedPath.config.nodes,
      edges: repairedPath.config.edges,
      reportAiPathsError: () => {},
    });
    const transferredRun = await runPortablePathServer(transferredPackagePayload, {
      validateBeforeRun: false,
      runtimeValidationEnabled: false,
    });

    expect(transferredRun.resolved.source).toBe('portable_package');
    expect(sourceRuntimeState.outputs).toEqual(transferredRun.runtimeState.outputs);
    expect(sourceRuntimeState.outputs[templateNodeId as string]?.['prompt']).toBe('sum=12');
    expect(transferredRun.runtimeState.outputs[templateNodeId as string]?.['prompt']).toBe(
      'sum=12'
    );
  });
});
