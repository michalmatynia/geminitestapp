'use client';

import React from 'react';

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

export function SectionPicker(props: TreeSectionPickerProps): React.ReactNode {
  if (props.variant === 'blocks') {
    if (props.disabled) return null;
    return <BlockPicker sectionType={props.sectionType} onSelect={props.onSelect} />;
  }

  return (
    <BaseSectionPicker
      disabled={props.disabled}
      zone={props.zone}
      onSelect={props.onSelect}
    />
  );
}
