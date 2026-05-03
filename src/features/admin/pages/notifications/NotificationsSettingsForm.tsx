import { FormSection, FormField, FormActions, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { positionOptions } from './types';
import { AccentPalette } from './AccentPalette';
import { PreviewButtons } from './PreviewButtons';
import type { PositionType, AccentType } from './types';
import type { LabeledOptionDto } from '@/shared/contracts/base';

export function NotificationsSettingsForm({
  accent,
  accentSelectOptions,
  onPreview,
  onSave,
  position,
  setAccent,
  setPosition,
}: {
  accent: AccentType;
  accentSelectOptions: LabeledOptionDto<string>[];
  onPreview: (variant: 'success' | 'error' | 'info') => void;
  onSave: () => void;
  position: PositionType;
  setAccent: (accent: AccentType) => void;
  setPosition: (position: PositionType) => void;
}): React.ReactNode {
  return (
    <FormSection title='Notification Preferences' className='p-6'>
      <div className='space-y-6'>
        <FormField
          label='Toast Position'
          description='Choose where notifications appear on your screen.'
        >
          <SelectSimple
            size='sm'
            value={position}
            onValueChange={(val: string) => setPosition(val as PositionType)}
            options={positionOptions}
            placeholder='Select position'
            ariaLabel='Select position'
            title='Select position'
          />
        </FormField>

        <FormField
          label='Accent Color'
          description='Select the primary color for success notifications.'
        >
          <SelectSimple
            size='sm'
            value={accent}
            onValueChange={(val: string) => setAccent(val as AccentType)}
            options={accentSelectOptions}
            placeholder='Select accent color'
            ariaLabel='Select accent color'
            title='Select accent color'
          />
        </FormField>

        <AccentPalette accent={accent} setAccent={setAccent} />

        <FormActions
          onSave={onSave}
          saveText='Save Settings'
          className='justify-start border-t border-border pt-6'
        >
          <PreviewButtons onPreview={onPreview} />
        </FormActions>
      </div>
    </FormSection>
  );
}
