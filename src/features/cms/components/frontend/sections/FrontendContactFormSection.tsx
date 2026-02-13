
'use client';

import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { useOptionalSectionBlockData } from './SectionBlockContext';

interface FrontendContactFormSectionProps {
  settings?: Record<string, unknown>;
}

export function FrontendContactFormSection({ settings: propSettings }: FrontendContactFormSectionProps): React.ReactNode {
  const sectionBlockData = useOptionalSectionBlockData();
  const settings = propSettings ?? sectionBlockData?.settings ?? {};
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const fields = ((settings['fields'] as string) || 'name,email,message')
    .split(',')
    .map((f: string) => f.trim())
    .filter(Boolean);
  const submitText = (settings['submitText'] as string) || 'Send message';

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-xl' })}>
        <form onSubmit={(e: React.FormEvent) => e.preventDefault()} className='space-y-4'>
          {fields.map((field: string) => {
            const isTextarea = field.toLowerCase() === 'message';
            const label = field.charAt(0).toUpperCase() + field.slice(1);

            return (
              <div key={field}>
                <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                  {label}
                </label>
                {isTextarea ? (
                  <textarea
                    rows={4}
                    placeholder={label}
                    className='w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    readOnly
                  />
                ) : (
                  <input
                    type={field.toLowerCase() === 'email' ? 'email' : 'text'}
                    placeholder={label}
                    className='w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    readOnly
                  />
                )}
              </div>
            );
          })}
          <button
            type='submit'
            className='cms-hover-button w-full rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200'
          >
            {submitText}
          </button>
        </form>
      </div>
    </section>
  );
}
