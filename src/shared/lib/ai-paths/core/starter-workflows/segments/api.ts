import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { PathMeta } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import {
  applyStarterProvenance,
  materializeSemanticAsset,
} from './utils';
import type {
  AiPathsStarterProvenance,
  AiPathTemplateRegistryEntry,
  MaterializeStarterWorkflowArgs,
} from './types';
import { STARTER_WORKFLOW_REGISTRY } from './templates';

export type StarterWorkflowRecoveryBundleScope = 'auto_seed' | 'static_recovery';

export type StarterWorkflowRecoveryBundle = {
  entries: AiPathTemplateRegistryEntry[];
  pathMetas: PathMeta[];
  pathConfigs: PathConfig[];
  triggerButtons: AiTriggerButtonRecord[];
};

export const getStarterWorkflowRegistry = (): AiPathTemplateRegistryEntry[] =>
  STARTER_WORKFLOW_REGISTRY.slice();

export const getStarterWorkflowTemplateById = (
  templateId: string
): AiPathTemplateRegistryEntry | null =>
  STARTER_WORKFLOW_REGISTRY.find((entry) => entry.templateId === templateId) ?? null;

export const getAutoSeedStarterWorkflowEntries = (): AiPathTemplateRegistryEntry[] =>
  STARTER_WORKFLOW_REGISTRY.filter((entry) => entry.seedPolicy?.autoSeed === true).sort(
    (left, right) => (left.seedPolicy?.sortOrder ?? 0) - (right.seedPolicy?.sortOrder ?? 0)
  );

export const getStaticRecoveryStarterWorkflowEntries = (): AiPathTemplateRegistryEntry[] =>
  STARTER_WORKFLOW_REGISTRY.filter(
    (entry) =>
      typeof entry.seedPolicy?.defaultPathId === 'string' &&
      entry.seedPolicy.defaultPathId.trim().length > 0 &&
      entry.seedPolicy.restoreOnStaticRecovery === true
  ).sort((left, right) => (left.seedPolicy?.sortOrder ?? 0) - (right.seedPolicy?.sortOrder ?? 0));

const resolveMaterializedStarterWorkflowArgs = (
  entry: AiPathTemplateRegistryEntry,
  args: MaterializeStarterWorkflowArgs
) => ({
  pathId: args.pathId ?? entry.seedPolicy?.defaultPathId ?? entry.semanticAsset.path.id,
  name: args.name ?? entry.name,
  description: args.description ?? entry.description,
  isActive: args.isActive ?? entry.seedPolicy?.isActive,
  isLocked: args.isLocked ?? entry.seedPolicy?.isLocked,
  updatedAt: args.updatedAt,
});

const buildStarterWorkflowProvenance = (
  entry: AiPathTemplateRegistryEntry,
  seededDefault: boolean
): AiPathsStarterProvenance => ({
  starterKey: entry.starterLineage.starterKey,
  templateId: entry.templateId,
  templateVersion: entry.starterLineage.templateVersion,
  seededDefault,
});

export const materializeStarterWorkflowPathConfig = (
  entry: AiPathTemplateRegistryEntry,
  args: MaterializeStarterWorkflowArgs = {}
): PathConfig => {
  const materialized = materializeSemanticAsset(
    entry.semanticAsset,
    resolveMaterializedStarterWorkflowArgs(entry, args)
  );
  return applyStarterProvenance(
    materialized,
    buildStarterWorkflowProvenance(entry, args.seededDefault === true)
  );
};

const buildRecoveryPathMeta = (config: PathConfig): PathMeta => {
  const fallbackTime = new Date().toISOString();
  const createdAt =
    typeof config.updatedAt === 'string' && config.updatedAt.trim().length > 0
      ? config.updatedAt
      : fallbackTime;

  return {
    id: config.id,
    name:
      typeof config.name === 'string' && config.name.trim().length > 0
        ? config.name.trim()
        : `Path ${config.id.slice(0, 6)}`,
    createdAt,
    updatedAt:
      typeof config.updatedAt === 'string' && config.updatedAt.trim().length > 0
        ? config.updatedAt
        : createdAt,
  };
};

const buildRecoveryTriggerButtonRecord = (
  preset: NonNullable<AiPathTemplateRegistryEntry['triggerButtonPresets']>[number],
  timestamp: string
): AiTriggerButtonRecord => ({
  id: preset.id,
  name: preset.name,
  pathId: preset.pathId,
  iconId: null,
  enabled: preset.enabled ?? true,
  locations: preset.locations,
  mode: preset.mode ?? 'click',
  display: preset.display ?? {
    label: preset.name,
    showLabel: true,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  sortIndex: preset.sortIndex ?? 0,
});

export const materializeStarterWorkflowRecoveryBundle = (
  scope: StarterWorkflowRecoveryBundleScope = 'static_recovery'
): StarterWorkflowRecoveryBundle => {
  const entries =
    scope === 'auto_seed'
      ? getAutoSeedStarterWorkflowEntries()
      : getStaticRecoveryStarterWorkflowEntries();
  const timestamp = new Date().toISOString();
  const pathConfigs = entries.flatMap((entry): PathConfig[] => {
    const pathId = entry.seedPolicy?.defaultPathId?.trim() ?? '';
    if (!pathId) return [];
    return [
      materializeStarterWorkflowPathConfig(entry, {
        pathId,
        seededDefault: entry.seedPolicy?.autoSeed === true,
      }),
    ];
  });
  const pathMetas = pathConfigs.map((config) => buildRecoveryPathMeta(config));
  const triggerButtons = entries.flatMap((entry): AiTriggerButtonRecord[] =>
    (entry.triggerButtonPresets ?? []).map((preset) =>
      buildRecoveryTriggerButtonRecord(preset, timestamp)
    )
  );

  return {
    entries,
    pathMetas,
    pathConfigs,
    triggerButtons,
  };
};
