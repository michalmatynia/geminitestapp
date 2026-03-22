'use client';

import React, { useCallback } from 'react';

import { useTreeActions } from '@/features/cms/hooks/useTreeActionsContext';
import type { PageZone } from '@/features/cms/types/page-builder';

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

function TreeBlockPicker(props: {
  disabled?: boolean;
  sectionType: string;
  onSelect: (value: string) => void;
}): React.ReactNode {
  const { disabled, sectionType, onSelect } = props;
  if (disabled) return null;
  return <BlockPicker sectionType={sectionType} onSelect={onSelect} />;
}

function TreeZoneSectionPicker(props: {
  disabled?: boolean;
  zone: PageZone;
  onSelect?: (value: string) => void;
}): React.ReactNode {
  const { disabled, zone, onSelect } = props;
  const { sectionActions } = useTreeActions();
  const handleSelect = useCallback(
    (sectionType: string): void => {
      if (onSelect) {
        onSelect(sectionType);
        return;
      }
      sectionActions.add(sectionType, zone);
    },
    [onSelect, sectionActions, zone]
  );
  return <BaseSectionPicker disabled={disabled} zone={zone} onSelect={handleSelect} />;
}

export function TreeSectionPicker(props: TreeSectionPickerProps): React.ReactNode {
  if (props.variant === 'blocks') {
    return (
      <TreeBlockPicker
        disabled={props.disabled}
        sectionType={props.sectionType}
        onSelect={props.onSelect}
      />
    );
  }

  return (
    <TreeZoneSectionPicker
      disabled={props.disabled}
      zone={props.zone}
      onSelect={props.onSelect}
    />
  );
}
