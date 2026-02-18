'use client';

import { FormSection, StatusToggle, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorDefaultPanel } from './validator-settings/ValidatorDefaultPanel';
import {
  ValidatorDocTooltip,
  ValidatorDocsTooltipsProvider,
  useValidatorDocsTooltips,
} from './validator-settings/ValidatorDocsTooltips';
import { ValidatorDocumentationTab } from './validator-settings/ValidatorDocumentationTab';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettings
 */
export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();

  return (
    <ValidatorDocsTooltipsProvider>
      <ValidatorSettingsProvider value={controller}>
        <Tabs defaultValue='workspace' className='w-full space-y-4'>
          <TabsList className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2'>
            <TabsTrigger value='workspace' className='h-10'>Workspace</TabsTrigger>
            <TabsTrigger value='docs' className='h-10'>Docs</TabsTrigger>
          </TabsList>

          <TabsContent value='workspace' className='space-y-5'>
            <ValidatorDocsTooltipsPanel />
            <ValidatorDefaultPanel />
            <ValidatorInstanceBehaviorPanel />
            <ValidatorPatternTablePanel />

            <ConfirmModal
              isOpen={!!controller.patternToDelete}
              onClose={() => controller.setPatternToDelete(null)}
              onConfirm={controller.handleDelete}
              title='Delete Pattern'
              message={`Delete validator pattern "${controller.patternToDelete?.label}"? This cannot be undone.`}
              confirmText='Delete'
              isDangerous={true}
            />

            <ValidatorPatternModal />
          </TabsContent>

          <TabsContent value='docs'>
            <ValidatorDocumentationTab />
          </TabsContent>
        </Tabs>
      </ValidatorSettingsProvider>
    </ValidatorDocsTooltipsProvider>
  );
}

function ValidatorDocsTooltipsPanel(): React.JSX.Element {
  const { enabled, setEnabled } = useValidatorDocsTooltips();
  return (
    <FormSection
      title='Documentation Tooltips'
      description='Enable hover tooltips powered by validator docs for controls and actions.'
      variant='subtle'
      className='p-4'
      actions={(
        <ValidatorDocTooltip docId='validator.docs.toggle'>
          <StatusToggle
            enabled={enabled}
            onToggle={() => {
              setEnabled(!enabled);
            }}
          />
        </ValidatorDocTooltip>
      )}
    >
      <p className='text-xs text-gray-400'>
        Turn this on to view inline docs hints for validator controls while editing patterns.
      </p>
    </FormSection>
  );
}
