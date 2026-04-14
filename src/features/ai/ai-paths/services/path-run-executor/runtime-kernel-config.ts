import 'server-only';

import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';
import { AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY } from '@/shared/lib/ai-paths/core/constants';
import { listAiPathsRuntimeCodeObjectResolverIds } from '@/shared/lib/ai-paths/core/runtime/code-object-resolver-registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  readRuntimeKernelConfigRecordFromMeta,
  type RuntimeKernelExecutionTelemetry,
  resolveRuntimeKernelConfigForRun,
  toRuntimeKernelExecutionTelemetry,
} from '../path-run-executor.runtime-kernel';

export type ResolvedRuntimeKernelConfig = {
  nodeTypes: string[] | undefined;
  resolverIds: string[] | undefined;
  missingResolverIds: string[];
  registeredResolverIds: string[];
  executionTelemetry: RuntimeKernelExecutionTelemetry;
};

export const resolveRuntimeKernelConfigForPathRun = async (args: {
  runId: string;
  runMetaRecord: Record<string, unknown> | null;
}): Promise<ResolvedRuntimeKernelConfig> => {
  const { runId, runMetaRecord } = args;

  const runMetaRuntimeKernelConfigRecord = readRuntimeKernelConfigRecordFromMeta(runMetaRecord);
  const runMetaRuntimeKernelConfigNodeTypes = runMetaRuntimeKernelConfigRecord?.['nodeTypes'];
  const runMetaRuntimeKernelResolverIds =
    runMetaRuntimeKernelConfigRecord?.['codeObjectResolverIds'];

  const runtimeKernelSettings = await listAiPathsSettings([
    AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
    AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
  ]).catch((error: unknown) => {
    void ErrorSystem.logWarning('Failed to load AI Paths runtime-kernel settings', {
      service: 'ai-paths-executor',
      runId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  });

  const runtimeKernelSettingsMap = new Map(
    runtimeKernelSettings.map((record) => [record.key, record.value])
  );

  const runtimeKernelConfig = resolveRuntimeKernelConfigForRun({
    envNodeTypes: process.env['AI_PATHS_RUNTIME_KERNEL_NODE_TYPES'],
    pathNodeTypes: runMetaRuntimeKernelConfigNodeTypes,
    settingNodeTypes: runtimeKernelSettingsMap.get(AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY),
    envResolverIds: process.env['AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS'],
    pathResolverIds: runMetaRuntimeKernelResolverIds,
    settingResolverIds: runtimeKernelSettingsMap.get(
      AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY
    ),
  });

  const nodeTypes = runtimeKernelConfig.nodeTypes;
  const resolverIds = runtimeKernelConfig.resolverIds;

  const registeredResolverIds = listAiPathsRuntimeCodeObjectResolverIds();
  const registeredResolverIdSet = new Set(registeredResolverIds);

  const missingResolverIds = (resolverIds ?? []).filter(
    (resolverId: string): boolean => !registeredResolverIdSet.has(resolverId)
  );

  const executionTelemetry = toRuntimeKernelExecutionTelemetry(runtimeKernelConfig);

  return {
    nodeTypes,
    resolverIds,
    missingResolverIds,
    registeredResolverIds,
    executionTelemetry,
  };
};
