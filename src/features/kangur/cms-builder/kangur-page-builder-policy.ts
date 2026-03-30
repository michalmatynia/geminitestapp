import type { BlockInstance, PageComponentInput } from '@/shared/contracts/cms';
import type { PageBuilderPolicyConfig } from '@/features/cms/public';

import type { KangurCmsScreenKey } from './project-contracts';

const KANGUR_GAME_HIDDEN_BLOCK_TYPES = ['Model3D', 'Model3DElement'] as const;
const KANGUR_GAME_HIDDEN_SECTION_TYPES = ['Model3DElement'] as const;
const KANGUR_GAME_HIDDEN_SETTINGS_FIELD_TYPES = ['asset3d'] as const;

const EMPTY_KANGUR_PAGE_BUILDER_POLICY: PageBuilderPolicyConfig = {};

export function buildKangurPageBuilderPolicy(
  activeScreenKey: KangurCmsScreenKey
): PageBuilderPolicyConfig {
  if (activeScreenKey !== 'Game') {
    return EMPTY_KANGUR_PAGE_BUILDER_POLICY;
  }

  return {
    hiddenBlockTypes: KANGUR_GAME_HIDDEN_BLOCK_TYPES,
    hiddenSectionTypes: KANGUR_GAME_HIDDEN_SECTION_TYPES,
    hiddenSettingsFieldTypes: KANGUR_GAME_HIDDEN_SETTINGS_FIELD_TYPES,
  };
}

const sanitizeBlocks = (
  blocks: BlockInstance[],
  hiddenBlockTypes: ReadonlySet<string>
): BlockInstance[] =>
  blocks.flatMap((block: BlockInstance) => {
    if (hiddenBlockTypes.has(block.type)) {
      return [];
    }

    if (!block.blocks) {
      return [block];
    }

    const nextBlocks = sanitizeBlocks(block.blocks, hiddenBlockTypes);
    if (block.blocks.length > 0 && nextBlocks.length === 0) {
      return [];
    }

    return [{ ...block, blocks: nextBlocks }];
  });

export function sanitizeKangurScreenComponents(
  activeScreenKey: KangurCmsScreenKey,
  components: PageComponentInput[]
): PageComponentInput[] {
  const policy = buildKangurPageBuilderPolicy(activeScreenKey);
  const hiddenBlockTypes = new Set(policy.hiddenBlockTypes ?? []);
  const hiddenSectionTypes = new Set(policy.hiddenSectionTypes ?? []);

  if (hiddenBlockTypes.size === 0 && hiddenSectionTypes.size === 0) {
    return components;
  }

  return components.flatMap((component: PageComponentInput) => {
    if (hiddenSectionTypes.has(component.type)) {
      return [];
    }

    const nextBlocks = sanitizeBlocks(component.content.blocks, hiddenBlockTypes);
    if (component.content.blocks.length > 0 && nextBlocks.length === 0) {
      return [];
    }

    return [
      {
        ...component,
        content: {
          ...component.content,
          blocks: nextBlocks,
        },
      },
    ];
  });
}
