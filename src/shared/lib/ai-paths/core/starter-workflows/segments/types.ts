import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import type {
  AiTriggerButtonDisplay,
  AiTriggerButtonLocation,
} from '@/shared/contracts/ai-trigger-buttons';

export type StarterWorkflowSeedPolicy = {
  autoSeed: boolean;
  defaultPathId?: string;
  isActive?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
};

export type StarterWorkflowTriggerPreset = {
  id: string;
  name: string;
  pathId: string;
  locations: AiTriggerButtonLocation[];
  mode?: 'click' | 'toggle' | 'execute_path' | 'open_chat' | 'open_url' | 'copy_text';
  enabled?: boolean;
  display?: AiTriggerButtonDisplay;
  sortIndex?: number;
};

export type StarterWorkflowLineage = {
  starterKey: string;
  templateVersion: number;
  canonicalGraphHashes: string[];
};

export type AiPathTemplateRegistryEntry = {
  templateId: string;
  name: string;
  description: string;
  semanticAsset: CanvasSemanticDocument;
  seedPolicy?: StarterWorkflowSeedPolicy;
  triggerButtonPresets?: StarterWorkflowTriggerPreset[];
  starterLineage: StarterWorkflowLineage;
};

export type AiPathsStarterProvenance = {
  starterKey: string;
  templateId: string;
  templateVersion: number;
  seededDefault: boolean;
};

export type StarterWorkflowResolution = {
  entry: AiPathTemplateRegistryEntry;
  matchedBy: 'provenance' | 'canonical_hash' | 'legacy_alias';
};

export type StarterWorkflowUpgradeResult = {
  config: PathConfig;
  changed: boolean;
  resolution: StarterWorkflowResolution | null;
};

export type MaterializeStarterWorkflowArgs = {
  pathId?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  isLocked?: boolean;
  seededDefault?: boolean;
  updatedAt?: string;
};

export type DeepValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type CanonicalNodeShape = {
  id: string;
  type: string;
  inputs: string[];
  outputs: string[];
  config: DeepValue;
};

export type CanonicalEdgeShape = {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
};
