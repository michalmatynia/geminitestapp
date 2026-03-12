import { CmsBuilderLeftPanel } from '@/features/cms/public';
import { KangurThemeSettingsEditor } from '@/features/kangur/admin/components/KangurThemeSettingsPanel';

export function KangurCmsBuilderLeftPanel(): React.JSX.Element {
  return <CmsBuilderLeftPanel variant='kangur' themePanel={<KangurThemeSettingsEditor />} />;
}
