'use client';

import { useEffect, useMemo, useState } from 'react';

import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
import {
  KANGUR_HELP_SETTINGS_KEY,
  areKangurDocsTooltipsEnabled,
  parseKangurHelpSettings,
  type KangurHelpSettings,
} from '@/features/kangur/help-settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Badge, Button, FormSection, Switch, useToast } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { KANGUR_GRID_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import { KangurAdminCard } from './KangurAdminCard';

const DOCS_TOOLTIP_SURFACES: Array<{
  key: keyof KangurHelpSettings['docsTooltips'];
  label: string;
  description: string;
  docId: string;
}> = [
  {
    key: 'homeEnabled',
    label: 'Home',
    description: 'Game home screen, quick-start practice, and practice shell controls.',
    docId: 'settings_docs_tooltips_home_toggle',
  },
  {
    key: 'lessonsEnabled',
    label: 'Lessons',
    description: 'Lesson library, document-mode lessons, and lesson navigation controls.',
    docId: 'settings_docs_tooltips_lessons_toggle',
  },
  {
    key: 'testsEnabled',
    label: 'Tests',
    description: 'Test-suite list and active suite playback controls.',
    docId: 'settings_docs_tooltips_tests_toggle',
  },
  {
    key: 'profileEnabled',
    label: 'Learner Profile',
    description: 'Learner progress summary, recommendations, and profile shortcuts.',
    docId: 'settings_docs_tooltips_profile_toggle',
  },
  {
    key: 'parentDashboardEnabled',
    label: 'Parent Dashboard',
    description: 'Learner switching, progress tabs, and assignment review on the parent surface.',
    docId: 'settings_docs_tooltips_parent_dashboard_toggle',
  },
  {
    key: 'adminEnabled',
    label: 'Admin',
    description: 'Documentation-driven tooltips inside Kangur admin routes, including this page.',
    docId: 'settings_docs_tooltips_admin_toggle',
  },
] as const;

const areHelpSettingsEqual = (left: KangurHelpSettings, right: KangurHelpSettings): boolean =>
  left.docsTooltips.enabled === right.docsTooltips.enabled &&
  left.docsTooltips.homeEnabled === right.docsTooltips.homeEnabled &&
  left.docsTooltips.lessonsEnabled === right.docsTooltips.lessonsEnabled &&
  left.docsTooltips.testsEnabled === right.docsTooltips.testsEnabled &&
  left.docsTooltips.profileEnabled === right.docsTooltips.profileEnabled &&
  left.docsTooltips.parentDashboardEnabled === right.docsTooltips.parentDashboardEnabled &&
  left.docsTooltips.adminEnabled === right.docsTooltips.adminEnabled;

export function KangurDocumentationTooltipSettingsPanel(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const rawHelpSettings = settingsStore.get(KANGUR_HELP_SETTINGS_KEY);
  const persistedHelpSettings = useMemo(
    () => parseKangurHelpSettings(rawHelpSettings),
    [rawHelpSettings]
  );
  const [helpSettings, setHelpSettings] = useState<KangurHelpSettings>(persistedHelpSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHelpSettings(persistedHelpSettings);
  }, [persistedHelpSettings]);

  const isDirty = !areHelpSettingsEqual(helpSettings, persistedHelpSettings);
  const adminDocsEnabled = areKangurDocsTooltipsEnabled(helpSettings, 'admin');

  const handleSave = async (): Promise<void> => {
    if (!isDirty) {
      return;
    }

    setIsSaving(true);
    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.docs-tooltips',
        action: 'save-settings',
        description: 'Saves documentation tooltip settings.',
      },
      async () => {
        await updateSetting.mutateAsync({
          key: KANGUR_HELP_SETTINGS_KEY,
          value: serializeSetting(helpSettings),
        });
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Failed to save Kangur tooltip settings.', {
            variant: 'error',
          });
        },
      }
    );

    if (didSave) {
      toast('Kangur documentation tooltip settings saved.', {
        variant: 'success',
      });
    }
    setIsSaving(false);
  };

  return (
    <>
      <KangurDocsTooltipEnhancer enabled={adminDocsEnabled} rootId='kangur-documentation-content' />
      <FormSection
        title='Docs & Tooltips'
        description='These toggles control documentation-driven tooltips. Tooltip text is sourced only from the central Kangur documentation files.'
        variant='subtle'
      >
        <KangurAdminCard>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold text-foreground'>Enable Kangur docs tooltips</div>
                <Badge variant={helpSettings.docsTooltips.enabled ? 'secondary' : 'outline'}>
                  {helpSettings.docsTooltips.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                Master switch for learner and admin tooltip help generated from the Kangur
                documentation catalog.
              </p>
            </div>
            <Switch
              checked={helpSettings.docsTooltips.enabled}
              onCheckedChange={(checked) =>
                setHelpSettings((current) => ({
                  ...current,
                  docsTooltips: {
                    ...current.docsTooltips,
                    enabled: checked,
                  },
                }))
              }
              data-doc-id='settings_docs_tooltips_master_toggle'
              aria-label='Enable Kangur docs tooltips'
            />
          </div>
        </KangurAdminCard>

        <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} lg:grid-cols-2`}>
          {DOCS_TOOLTIP_SURFACES.map((surface) => (
            <KangurAdminCard key={surface.key}>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <div className='text-sm font-semibold text-foreground'>{surface.label}</div>
                    <Badge variant={helpSettings.docsTooltips[surface.key] ? 'secondary' : 'outline'}>
                      {helpSettings.docsTooltips[surface.key] ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>{surface.description}</p>
                </div>
                <Switch
                  checked={helpSettings.docsTooltips[surface.key]}
                  onCheckedChange={(checked) =>
                    setHelpSettings((current) => ({
                      ...current,
                      docsTooltips: {
                        ...current.docsTooltips,
                        [surface.key]: checked,
                      },
                    }))
                  }
                  data-doc-id={surface.docId}
                  aria-label={`${surface.label} docs tooltips`}
                />
              </div>
            </KangurAdminCard>
          ))}
        </div>

        <KangurAdminCard>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold text-foreground'>Current admin preview</div>
                <Badge variant={adminDocsEnabled ? 'secondary' : 'outline'}>
                  {adminDocsEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                Tooltips on this page follow the in-progress settings state before you save.
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!isDirty || isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              {isSaving ? 'Saving…' : 'Save tooltip settings'}
            </Button>
          </div>
        </KangurAdminCard>
      </FormSection>
    </>
  );
}
