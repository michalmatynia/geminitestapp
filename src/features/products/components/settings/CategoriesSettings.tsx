'use client';

import { useCategoriesSettingsController } from './CategoriesSettings.controller';
import { CategoriesSettingsView } from './CategoriesSettings.view';

export function CategoriesSettings(): React.JSX.Element {
  const controller = useCategoriesSettingsController();
  return <CategoriesSettingsView controller={controller} />;
}
