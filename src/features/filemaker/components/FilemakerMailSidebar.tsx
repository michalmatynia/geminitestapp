'use client';

import React from 'react';

import { useFilemakerMailSidebarModel } from './FilemakerMailSidebar.model';
import type { FilemakerMailSidebarProps } from './FilemakerMailSidebar.types';
import { FilemakerMailSidebarView } from './FilemakerMailSidebar.view';

export type {
  FilemakerMailSidebarActions,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarProps,
  FilemakerMailSidebarSelection,
} from './FilemakerMailSidebar.types';

export function FilemakerMailSidebar(props: FilemakerMailSidebarProps): React.JSX.Element {
  const model = useFilemakerMailSidebarModel(props);
  return <FilemakerMailSidebarView actions={props.actions} model={model} />;
}
