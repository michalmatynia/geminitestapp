import { describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  createNodeRuntimeKernel,
  resolveNodeRuntimeKernelMode,
} from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

const buildHandler = (label: string): NodeHandler =>
  vi.fn(async () => ({
    status: 'completed',
    value: label,
  }));

describe('node-runtime-kernel', () => {
  it('resolves pilot node types through code_object_v3 strategy while keeping legacy handlers', () => {
    const constantHandler = buildHandler('constant');
    const templateHandler = buildHandler('template');
    const mathHandler = buildHandler('math');

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        ({
          constant: constantHandler,
          template: templateHandler,
          math: mathHandler,
        })[nodeType] ?? null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('constant');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.constant.v3');
    expect(runtimeKernel.resolveHandler('constant')).toBe(constantHandler);

    const templateDescriptor = runtimeKernel.resolveDescriptor('template');
    expect(templateDescriptor.strategy).toBe('code_object_v3');
    expect(templateDescriptor.codeObjectId).toBe('ai-paths.node-code-object.template.v3');
    expect(runtimeKernel.resolveHandler('template')).toBe(templateHandler);
  });

  it('keeps non-pilot node types on legacy_adapter strategy', () => {
    const databaseHandler = buildHandler('database');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'database' ? databaseHandler : null),
    });

    const descriptor = runtimeKernel.resolveDescriptor('database');
    expect(descriptor.strategy).toBe('legacy_adapter');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.codeObjectId).toBeNull();
    expect(descriptor.handler).toBe(databaseHandler);
  });

  it('prefers override handlers before legacy registry handlers', () => {
    const legacyMathHandler = buildHandler('legacy');
    const overrideMathHandler = buildHandler('override');

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'math' ? legacyMathHandler : null,
      resolveOverrideHandler: (nodeType: string) =>
        nodeType === 'math' ? overrideMathHandler : null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('math');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('override');
    expect(descriptor.handler).toBe(overrideMathHandler);
    expect(runtimeKernel.resolveHandler('math')).toBe(overrideMathHandler);
  });

  it('reports missing handlers without throwing in descriptor resolution', () => {
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: () => null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('unknown_type');
    expect(descriptor.source).toBe('missing');
    expect(descriptor.strategy).toBe('legacy_adapter');
    expect(descriptor.handler).toBeNull();
    expect(runtimeKernel.resolveHandler('unknown_type')).toBeNull();
  });

  it('supports custom pilot lists for staged migration rollouts', () => {
    const databaseHandler = buildHandler('database');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'database' ? databaseHandler : null),
      v3PilotNodeTypes: ['database'],
    });

    const descriptor = runtimeKernel.resolveDescriptor('database');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.database.v3');
    expect(descriptor.handler).toBe(databaseHandler);
  });

  it('supports legacy_only mode as a rollout kill switch', () => {
    const constantHandler = buildHandler('constant');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'constant' ? constantHandler : null),
      mode: 'legacy_only',
    });

    const descriptor = runtimeKernel.resolveDescriptor('constant');
    expect(descriptor.strategy).toBe('legacy_adapter');
    expect(descriptor.codeObjectId).toBeNull();
    expect(descriptor.handler).toBe(constantHandler);
  });

  it('normalizes unknown runtime kernel mode to auto', () => {
    expect(resolveNodeRuntimeKernelMode('auto')).toBe('auto');
    expect(resolveNodeRuntimeKernelMode('legacy_only')).toBe('legacy_only');
    expect(resolveNodeRuntimeKernelMode('unexpected_mode')).toBe('auto');
    expect(resolveNodeRuntimeKernelMode(undefined)).toBe('auto');
  });
});
