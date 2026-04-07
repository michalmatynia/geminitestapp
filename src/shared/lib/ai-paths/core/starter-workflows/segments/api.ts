import type { PathConfig } from '@/shared/contracts/ai-paths';
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
