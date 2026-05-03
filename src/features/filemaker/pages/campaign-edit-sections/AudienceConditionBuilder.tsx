'use client';

import React from 'react';

import { normalizeAudienceConditionGroup } from '../../settings/campaign-audience-normalization.helpers';
import type { FilemakerAudienceConditionGroup } from '@/shared/contracts/filemaker';

import { AudienceGroupEditor } from './AudienceConditionBuilder.editor';
import type { AudienceConditionValueOptions } from './AudienceConditionBuilder.options';

export type {
  AudienceConditionValueOption,
  AudienceConditionValueOptions,
} from './AudienceConditionBuilder.options';

type AudienceConditionBuilderProps = {
  fieldValueOptions?: AudienceConditionValueOptions;
  value: FilemakerAudienceConditionGroup;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
};

export function AudienceConditionBuilder({
  fieldValueOptions = {},
  value,
  onChange,
}: AudienceConditionBuilderProps): React.JSX.Element {
  return (
    <AudienceGroupEditor
      depth={0}
      fieldValueOptions={fieldValueOptions}
      group={normalizeAudienceConditionGroup(value)}
      onChange={onChange}
    />
  );
}
