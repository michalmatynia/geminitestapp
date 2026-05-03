'use client';
'use no memo';

import React from 'react';

import { BaseQuickExportButtonView } from './BaseQuickExportButtonView';
import {
  useBaseQuickExportButtonModel,
  type BaseQuickExportButtonProps,
} from './useBaseQuickExportButtonModel';

export function BaseQuickExportButton(
  props: BaseQuickExportButtonProps
): React.JSX.Element {
  const model = useBaseQuickExportButtonModel(props);
  return <BaseQuickExportButtonView model={model} />;
}
