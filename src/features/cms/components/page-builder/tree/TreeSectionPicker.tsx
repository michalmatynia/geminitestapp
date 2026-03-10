'use client';

import React, { useCallback, useMemo } from 'react';

import { useTreeActions } from '@/features/cms/hooks/useTreeActionsContext';
import type { PageZone } from '@/features/cms/types/page-builder';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { BlockPicker } from '../BlockPicker';
import { SectionPicker as BaseSectionPicker } from '../SectionPicker';


type SectionVariantProps = {
  disabled?: boolean;
  zone: PageZone;
  onSelect?: (sectionType: string) => void;
  variant?: 'sections';
  sectionType?: never;
};

type BlockVariantProps = {
  disabled?: boolean;
  sectionType: string;
  onSelect: (blockType: string) => void;
  variant: 'blocks';
  zone?: never;
};

type TreeSectionPickerProps = SectionVariantProps | BlockVariantProps;

type TreeSectionPickerRuntimeValue = {
  onSelect: ((value: string) => void) | null;
  disabled: boolean;
  sectionType: string | null;
  zone: PageZone | null;
};

const { Context: TreeSectionPickerRuntimeContext, useStrictContext: useTreeSectionPickerRuntime } =
  createStrictContext<TreeSectionPickerRuntimeValue>({
    hookName: 'useTreeSectionPickerRuntime',
    providerName: 'TreeSectionPickerRuntimeProvider',
    displayName: 'TreeSectionPickerRuntimeContext',
  });

function TreeBlockPicker(): React.ReactNode {
  const runtime = useTreeSectionPickerRuntime();
  if (runtime.disabled || runtime.sectionType === null || runtime.onSelect === null) return null;
  return <BlockPicker sectionType={runtime.sectionType} onSelect={runtime.onSelect} />;
}

function TreeZoneSectionPicker(): React.ReactNode {
  const runtime = useTreeSectionPickerRuntime();
  const { sectionActions } = useTreeActions();
  if (runtime.zone === null) return null;
  const zone = runtime.zone;
  const handleSelect = useCallback(
    (sectionType: string): void => {
      if (runtime.onSelect) {
        runtime.onSelect(sectionType);
        return;
      }
      sectionActions.add(sectionType, zone);
    },
    [runtime.onSelect, sectionActions, zone]
  );
  return <BaseSectionPicker disabled={runtime.disabled} zone={zone} onSelect={handleSelect} />;
}

export function TreeSectionPicker(props: TreeSectionPickerProps): React.ReactNode {
  const sectionType = props.variant === 'blocks' ? props.sectionType : null;
  const zone = props.variant === 'blocks' ? null : props.zone;
  const runtimeValue = useMemo<TreeSectionPickerRuntimeValue>(
    () => ({
      onSelect: props.onSelect ?? null,
      disabled: Boolean(props.disabled),
      sectionType,
      zone,
    }),
    [props.onSelect, props.disabled, sectionType, zone]
  );

  if (props.variant === 'blocks') {
    return (
      <TreeSectionPickerRuntimeContext.Provider value={runtimeValue}>
        <TreeBlockPicker />
      </TreeSectionPickerRuntimeContext.Provider>
    );
  }

  return (
    <TreeSectionPickerRuntimeContext.Provider value={runtimeValue}>
      <TreeZoneSectionPicker />
    </TreeSectionPickerRuntimeContext.Provider>
  );
}
