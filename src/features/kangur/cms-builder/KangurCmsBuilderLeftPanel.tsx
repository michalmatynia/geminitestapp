import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { CmsBuilderLeftPanel, type LeftPanelMode } from '@/features/cms/public';
import {
  KangurThemeSettingsPanel,
  type KangurThemeMode,
} from '@/features/kangur/admin/components/KangurThemeSettingsPanel';

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
  const handleModeChange = onModeChange;
  const handleThemeSectionChange = onThemeSectionChange;
  const handleThemeChange = onThemeChange;
  const handleThemeModeChange = onThemeModeChange;

  const themePanel = (
    <KangurThemeSettingsPanel
      onSectionChange={handleThemeSectionChange}
      onThemeChange={handleThemeChange}
      onModeChange={handleThemeModeChange}
    />
  );

  return (
    <CmsBuilderLeftPanel
      variant='kangur'
      onModeChange={handleModeChange}
      themePanel={themePanel}
    />
  );
}
