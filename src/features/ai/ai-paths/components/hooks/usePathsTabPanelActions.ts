import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { triggers } from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui/primitives.public';

import { useGraphState } from '../../context';
import { usePersistenceActions } from '../../context/PersistenceContext';
import { useAiPathsErrorReporting } from '../ai-paths-settings/useAiPathsErrorReporting';
import { useAiPathsSettingsPathActions } from '../ai-paths-settings/useAiPathsSettingsPathActions';

function normalizeTriggerLabel(value?: string | null): string {
  return value === 'Product Modal - Context Grabber'
    ? 'Product Modal - Context Filter'
    : (value ?? triggers[0] ?? 'Product Modal - Context Filter');
}

export function usePathsTabPanelActions() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { activePathId, isPathLocked, pathConfigs, paths } = useGraphState();
  const {
    persistPathSettings,
    persistSettingsBulk,
    persistActivePathPreference,
    savePathIndex,
  } = usePersistenceActions();
  const { reportAiPathsError } = useAiPathsErrorReporting('paths');

  const pathActions = useAiPathsSettingsPathActions({
    activePathId,
    isPathLocked,
    pathConfigs,
    paths,
    normalizeTriggerLabel,
    persistPathSettings: async (nextPaths, configId, config) => {
      await persistPathSettings(nextPaths, configId, config);
    },
    persistSettingsBulk,
    persistActivePathPreference,
    reportAiPathsError,
    confirm,
    toast,
  });

  return {
    ...pathActions,
    savePathIndex,
    persistPathSettings,
    toast,
    reportAiPathsError,
    ConfirmationModal,
  };
}
