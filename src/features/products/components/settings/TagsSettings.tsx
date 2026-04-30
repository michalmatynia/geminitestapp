'use client';

import React from 'react';

import {
  TagsCatalogSection,
  TagsDeleteModal,
  TagsFormModal,
  TagsListSection,
  TagsNoCatalogsEmptyState,
} from './TagsSettings.sections';
import { useTagsSettingsController } from './TagsSettings.controller';

export function TagsSettings(): React.JSX.Element {
  const controller = useTagsSettingsController();

  return (
    <div className='space-y-5'>
      <TagsCatalogSection controller={controller} />
      {controller.hasSelectedCatalog ? <TagsListSection controller={controller} /> : null}
      {controller.showNoCatalogsEmptyState ? <TagsNoCatalogsEmptyState /> : null}
      <TagsDeleteModal controller={controller} />
      {controller.showModal ? <TagsFormModal controller={controller} /> : null}
    </div>
  );
}
