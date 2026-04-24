import { useState, useMemo } from 'react';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import {
  FRONT_PAGE_OPTIONS,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_OPTION_LABELS = new Map(
  FRONT_PAGE_OPTIONS.map((option) => [option.id, option.title])
);

export function useFrontPageController(initialSelected: FrontPageSelectableApp) {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [selected, setSelected] = useState<FrontPageSelectableApp>(initialSelected);
  const updateSetting = useUpdateSetting();
  
  const isDirty = selected !== initialSelected;
  const currentLabel = useMemo(
    () => FRONT_PAGE_OPTION_LABELS.get(initialSelected) ?? initialSelected,
    [initialSelected]
  );
  const pendingLabel = useMemo(
    () => FRONT_PAGE_OPTION_LABELS.get(selected) ?? selected,
    [selected]
  );

  const persistSelection = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FRONT_PAGE_SETTING_KEY,
        value: selected,
      });
      toast(`Front page updated to ${pendingLabel}`, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AdminFrontManagePage', action: 'saveSettings' });
      toast('Failed to save front page setting', { variant: 'error' });
    }
  };

  const handleSaveClick = (): void => {
    if (!isDirty) return;

    if (initialSelected !== 'cms' && selected === 'cms') {
      confirm({
        title: 'Switch HOME to CMS?',
        message: 'This will stop mounting StudiQ at HOME and restore the CMS-owned page with zoning.',
        confirmText: 'Switch to CMS',
        isDangerous: true,
        onConfirm: persistSelection,
      });
      return;
    }
    persistSelection().catch(logClientCatch);
  };

  return {
    ConfirmationModal,
    currentLabel,
    handleSaveClick,
    isDirty,
    isSaving: updateSetting.isPending,
    pendingLabel,
    selected,
    setSelected,
  };
}
