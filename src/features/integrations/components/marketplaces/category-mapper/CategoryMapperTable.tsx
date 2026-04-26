'use client';

import React from 'react';

import { CategoryMapperTablePanel } from './category-table/CategoryMapperTablePanel';
import { useCategoryMapperTableModel } from './category-table/useCategoryMapperTableModel';

export function CategoryMapperTable(): React.JSX.Element {
  return <CategoryMapperTablePanel {...useCategoryMapperTableModel()} />;
}
