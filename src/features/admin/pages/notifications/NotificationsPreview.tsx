import { FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import type { PositionType, AccentType } from './types';

export function NotificationsPreview({
  accent,
  accentColor,
  position,
  preview,
}: {
  accent: AccentType;
  accentColor: string;
  position: PositionType;
  preview: { x: string; y: string };
}): React.ReactNode {
  return (
    <FormSection title='Position Preview' className='sticky top-6 p-6'>
      <FormSection variant='subtle' className='relative aspect-video w-full bg-card/40'>
        <div
          className={`absolute ${preview.x}-3 ${preview.y}-3 flex size-10 items-center justify-center rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10`}
        >
          <div className='size-1 rounded-full bg-emerald-400' />
        </div>

        <div className='absolute left-2 top-2 text-xs text-gray-500'>TL</div>
        <div className='absolute right-2 top-2 text-xs text-gray-500'>TR</div>
        <div className='absolute bottom-2 left-2 text-xs text-gray-500'>BL</div>
        <div className='absolute bottom-2 right-2 text-xs text-gray-500'>BR</div>
      </FormSection>

      <FormSection variant='subtle-compact' className='mt-4 space-y-2 bg-card/40 p-3'>
        <p className='text-xs font-medium text-gray-300'>Current Settings:</p>
        <div className='space-y-1.5'>
          <MetadataItem
            label='Position'
            value={position}
            valueClassName='capitalize'
            mono
            variant='minimal'
          />
          <MetadataItem
            label='Accent'
            icon={<span className={`size-2 rounded-full ${accentColor}`} aria-hidden='true' />}
            value={accent}
            valueClassName='capitalize'
            mono
            variant='minimal'
          />
        </div>
      </FormSection>

      <Hint
        variant='info'
        className='mt-4 rounded-md border border-blue-500/20 bg-blue-500/5 p-3 italic'
        size='xs'
      >
        Click the preview buttons to see how notifications appear with your settings.
      </Hint>
    </FormSection>
  );
}
