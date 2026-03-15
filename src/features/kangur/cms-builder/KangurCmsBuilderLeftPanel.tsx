import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { CmsBuilderLeftPanel } from '@/features/cms/public';
import {
  KangurThemeSettingsPanel,
  type KangurThemeMode,
} from '@/features/kangur/admin/components/KangurThemeSettingsPanel';
import type { LeftPanelMode } from '@/features/cms/components/page-builder/CmsBuilderLeftPanel';

export type KangurCmsBuilderLeftPanelProps = {
  onModeChange?: (mode: LeftPanelMode) => void;
  onThemeSectionChange?: (section: string) => void;
  onThemeChange?: (theme: ThemeSettings) => void;
  onThemeModeChange?: (mode: KangurThemeMode) => void;
};

export function KangurCmsBuilderLeftPanel({
  onModeChange,
  onThemeSectionChange,
  onThemeChange,
  onThemeModeChange,
}: KangurCmsBuilderLeftPanelProps): React.JSX.Element {
  return (
    <CmsBuilderLeftPanel
      variant='kangur'
      onModeChange={onModeChange}
      themePanel={
        <KangurThemeSettingsPanel
          onSectionChange={onThemeSectionChange}
          onThemeChange={onThemeChange}
          onModeChange={onThemeModeChange}
        />
      }
    />
  );
}
