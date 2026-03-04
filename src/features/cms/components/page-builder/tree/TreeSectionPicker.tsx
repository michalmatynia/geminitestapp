'use client';

import React, { useMemo } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { BlockPicker } from '../BlockPicker';
import { SectionPicker as BaseSectionPicker } from '../SectionPicker';

import type { PageZone } from '../../../types/page-builder';

type SectionVariantProps = {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
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
  onSelect: (value: string) => void;
  disabled: boolean;
  sectionType: string | null;
  zone: PageZone | null;
};

const {
  Context: TreeSectionPickerRuntimeContext,
  useStrictContext: useTreeSectionPickerRuntime,
} = createStrictContext<TreeSectionPickerRuntimeValue>({
  hookName: 'useTreeSectionPickerRuntime',
  providerName: 'TreeSectionPickerRuntimeProvider',
  displayName: 'TreeSectionPickerRuntimeContext',
});

function TreeBlockPicker(): React.ReactNode {
  const runtime = useTreeSectionPickerRuntime();
  if (runtime.disabled || runtime.sectionType === null) return null;
  return <BlockPicker sectionType={runtime.sectionType} onSelect={runtime.onSelect} />;
}

function TreeZoneSectionPicker(): React.ReactNode {
  const runtime = useTreeSectionPickerRuntime();
  if (runtime.zone === null) return null;
  return <BaseSectionPicker disabled={runtime.disabled} zone={runtime.zone} onSelect={runtime.onSelect} />;
}

export function TreeSectionPicker(props: TreeSectionPickerProps): React.ReactNode {
  const sectionType = props.variant === 'blocks' ? props.sectionType : null;
  const zone = props.variant === 'blocks' ? null : props.zone;
  const runtimeValue = useMemo<TreeSectionPickerRuntimeValue>(
    () => ({
      onSelect: props.onSelect,
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
