'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type {
  BlockDefinition,
  BlockInstance,
  ClipboardData,
  PageBuilderSnapshot,
  PageBuilderState,
  SectionDefinition,
  SectionInstance,
  SettingsField,
} from '@/shared/contracts/cms';

import type { PageZone } from '../../types/page-builder';

export type PageBuilderPolicyConfig = {
  hiddenBlockTypes?: readonly string[];
  hiddenSectionTypes?: readonly string[];
  hiddenSettingsFieldTypes?: ReadonlyArray<SettingsField['type']>;
};

type PageBuilderSectionScope = {
  zone: PageZone;
};

export type PageBuilderPolicyValue = {
  filterBlockDefinitions: (definitions: BlockDefinition[]) => BlockDefinition[];
  filterBlockTypes: (blockTypes: readonly string[]) => string[];
  filterSectionDefinitions: (
    definitions: SectionDefinition[],
    scope: PageBuilderSectionScope
  ) => SectionDefinition[];
  filterSettingsFields: (fields: SettingsField[]) => SettingsField[];
  sanitizeState: (state: PageBuilderState) => PageBuilderState;
  isBlockTypeAvailable: (blockType: string) => boolean;
  isSectionTypeAvailable: (sectionType: string) => boolean;
};

const sanitizeBlocks = (
  blocks: BlockInstance[],
  isBlockTypeAvailable: (blockType: string) => boolean
): BlockInstance[] =>
  blocks.flatMap((block: BlockInstance) => {
    if (!isBlockTypeAvailable(block.type)) {
      return [];
    }

    if (!block.blocks) {
      return [block];
    }

    const nextBlocks = sanitizeBlocks(block.blocks, isBlockTypeAvailable);
    if (block.blocks.length > 0 && nextBlocks.length === 0) {
      return [];
    }

    return [{ ...block, blocks: nextBlocks }];
  });

const sanitizeSections = (
  sections: SectionInstance[],
  isSectionTypeAvailable: (sectionType: string) => boolean,
  isBlockTypeAvailable: (blockType: string) => boolean
): SectionInstance[] => {
  const stagedSections = sections.flatMap((section: SectionInstance) => {
    if (!isSectionTypeAvailable(section.type)) {
      return [];
    }

    const nextBlocks = sanitizeBlocks(section.blocks, isBlockTypeAvailable);
    if (section.blocks.length > 0 && nextBlocks.length === 0) {
      return [];
    }

    return [{ ...section, blocks: nextBlocks }];
  });

  const sectionById = new Map<string, SectionInstance>(
    stagedSections.map((section: SectionInstance) => [section.id, section])
  );
  const parentAllowance = new Map<string, boolean>();
  const isSectionAllowedByParent = (section: SectionInstance): boolean => {
    const cached = parentAllowance.get(section.id);
    if (cached !== undefined) {
      return cached;
    }

    if (!section.parentSectionId) {
      parentAllowance.set(section.id, true);
      return true;
    }

    const parent = sectionById.get(section.parentSectionId);
    const allowed = parent ? isSectionAllowedByParent(parent) : false;
    parentAllowance.set(section.id, allowed);
    return allowed;
  };

  return stagedSections.filter((section: SectionInstance) => isSectionAllowedByParent(section));
};

const buildSanitizedClipboard = (
  clipboard: ClipboardData | null,
  isSectionTypeAvailable: (sectionType: string) => boolean,
  isBlockTypeAvailable: (blockType: string) => boolean
): ClipboardData | null => {
  if (!clipboard) {
    return null;
  }

  if (clipboard.type === 'block') {
    return isBlockTypeAvailable(clipboard.data.type)
      ? {
          ...clipboard,
          data: sanitizeBlocks([clipboard.data], isBlockTypeAvailable)[0] ?? clipboard.data,
        }
      : null;
  }

  if (clipboard.type === 'section') {
    const sanitized = sanitizeSections(
      [clipboard.data],
      isSectionTypeAvailable,
      isBlockTypeAvailable
    )[0];
    return sanitized ? { ...clipboard, data: sanitized } : null;
  }

  const sanitizedSections = sanitizeSections(
    clipboard.data.sections,
    isSectionTypeAvailable,
    isBlockTypeAvailable
  );
  const hasRoot = sanitizedSections.some(
    (section: SectionInstance) => section.id === clipboard.data.rootSectionId
  );
  return hasRoot
    ? {
        ...clipboard,
        data: {
          ...clipboard.data,
          sections: sanitizedSections,
        },
      }
    : null;
};

const sanitizeSnapshot = (
  snapshot: PageBuilderSnapshot,
  isSectionTypeAvailable: (sectionType: string) => boolean,
  isBlockTypeAvailable: (blockType: string) => boolean
): PageBuilderSnapshot => {
  const sections = sanitizeSections(snapshot.sections, isSectionTypeAvailable, isBlockTypeAvailable);
  const currentPage = snapshot.currentPage
    ? {
        ...snapshot.currentPage,
        components: sections.map((section: SectionInstance, index: number) => ({
          type: section.type,
          order: index,
          content: {
            zone: section.zone,
            settings: section.settings,
            blocks: section.blocks,
            sectionId: section.id,
            parentSectionId: section.parentSectionId ?? null,
          },
        })),
      }
    : snapshot.currentPage;

  return {
    ...snapshot,
    currentPage,
    sections,
  };
};

const stateContainsNodeId = (sections: SectionInstance[], nodeId: string | null): boolean => {
  if (!nodeId) {
    return false;
  }

  const hasBlockId = (blocks: BlockInstance[]): boolean =>
    blocks.some(
      (block: BlockInstance) =>
        block.id === nodeId || Boolean(block.blocks && hasBlockId(block.blocks))
    );

  return sections.some(
    (section: SectionInstance) => section.id === nodeId || hasBlockId(section.blocks)
  );
};

const EMPTY_POLICY_VALUE: PageBuilderPolicyValue = {
  filterBlockDefinitions: (definitions: BlockDefinition[]): BlockDefinition[] => definitions,
  filterBlockTypes: (blockTypes: readonly string[]): string[] => [...blockTypes],
  filterSectionDefinitions: (definitions: SectionDefinition[]): SectionDefinition[] => definitions,
  filterSettingsFields: (fields: SettingsField[]): SettingsField[] => fields,
  sanitizeState: (state: PageBuilderState): PageBuilderState => state,
  isBlockTypeAvailable: (): boolean => true,
  isSectionTypeAvailable: (): boolean => true,
};

const PageBuilderPolicyContext = createContext<PageBuilderPolicyValue>(EMPTY_POLICY_VALUE);

export function createPageBuilderPolicyValue(
  config?: PageBuilderPolicyConfig
): PageBuilderPolicyValue {
  if (!config) {
    return EMPTY_POLICY_VALUE;
  }

  const hiddenBlockTypes = new Set(config.hiddenBlockTypes ?? []);
  const hiddenSectionTypes = new Set(config.hiddenSectionTypes ?? []);
  const hiddenSettingsFieldTypes = new Set(config.hiddenSettingsFieldTypes ?? []);

  const isBlockTypeAvailable = (blockType: string): boolean => !hiddenBlockTypes.has(blockType);
  const isSectionTypeAvailable = (sectionType: string): boolean =>
    !hiddenSectionTypes.has(sectionType);

  return {
    filterBlockDefinitions: (definitions: BlockDefinition[]): BlockDefinition[] =>
      definitions.filter((definition: BlockDefinition) => isBlockTypeAvailable(definition.type)),
    filterBlockTypes: (blockTypes: readonly string[]): string[] =>
      blockTypes.filter((blockType: string) => isBlockTypeAvailable(blockType)),
    filterSectionDefinitions: (
      definitions: SectionDefinition[],
      _scope: PageBuilderSectionScope
    ): SectionDefinition[] =>
      definitions
        .filter((definition: SectionDefinition) => isSectionTypeAvailable(definition.type))
        .map((definition: SectionDefinition) => {
          const filteredAllowedBlockTypes = definition.allowedBlockTypes.filter((blockType: string) =>
            isBlockTypeAvailable(blockType)
          );
          return filteredAllowedBlockTypes.length === definition.allowedBlockTypes.length
            ? definition
            : {
                ...definition,
                allowedBlockTypes: filteredAllowedBlockTypes,
              };
        }),
    filterSettingsFields: (fields: SettingsField[]): SettingsField[] =>
      fields.filter((field: SettingsField) => !hiddenSettingsFieldTypes.has(field.type)),
    sanitizeState: (state: PageBuilderState): PageBuilderState => {
      const sections = sanitizeSections(state.sections, isSectionTypeAvailable, isBlockTypeAvailable);
      const currentPage = state.currentPage
        ? {
            ...state.currentPage,
            components: sections.map((section: SectionInstance, index: number) => ({
              type: section.type,
              order: index,
              content: {
                zone: section.zone,
                settings: section.settings,
                blocks: section.blocks,
                sectionId: section.id,
                parentSectionId: section.parentSectionId ?? null,
              },
            })),
          }
        : state.currentPage;
      const selectedNodeId = stateContainsNodeId(sections, state.selectedNodeId)
        ? state.selectedNodeId
        : null;

      return {
        ...state,
        currentPage,
        sections,
        selectedNodeId,
        clipboard: buildSanitizedClipboard(
          state.clipboard,
          isSectionTypeAvailable,
          isBlockTypeAvailable
        ),
        history: {
          past: state.history.past.map((snapshot: PageBuilderSnapshot) =>
            sanitizeSnapshot(snapshot, isSectionTypeAvailable, isBlockTypeAvailable)
          ),
          future: state.history.future.map((snapshot: PageBuilderSnapshot) =>
            sanitizeSnapshot(snapshot, isSectionTypeAvailable, isBlockTypeAvailable)
          ),
        },
      };
    },
    isBlockTypeAvailable,
    isSectionTypeAvailable,
  };
}

export function PageBuilderPolicyProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: PageBuilderPolicyConfig;
}): React.JSX.Element {
  const resolvedValue = useMemo(() => createPageBuilderPolicyValue(value), [value]);

  return (
    <PageBuilderPolicyContext.Provider value={resolvedValue}>
      {children}
    </PageBuilderPolicyContext.Provider>
  );
}

export const usePageBuilderPolicy = (): PageBuilderPolicyValue => useContext(PageBuilderPolicyContext);
