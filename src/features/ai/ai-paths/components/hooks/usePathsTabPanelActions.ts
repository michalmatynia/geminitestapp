import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { normalizeAiPathTriggerLabel } from '@/shared/lib/ai-paths/core/utils/trigger-label-migration';
import { useToast } from '@/shared/ui/primitives.public';

import { usePathMetadataState } from '../../context';
import { usePersistenceActions } from '../../context/PersistenceContext';
import { useAiPathsErrorReporting } from '../ai-paths-settings/useAiPathsErrorReporting';
import { useAiPathsSettingsPathActions } from '../ai-paths-settings/useAiPathsSettingsPathActions';

export function usePathsTabPanelActions() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { activePathId, isPathLocked, pathConfigs, paths } = usePathMetadataState();
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
    normalizeTriggerLabel: normalizeAiPathTriggerLabel,
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
