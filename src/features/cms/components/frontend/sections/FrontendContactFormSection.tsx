'use client';

import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { useSectionBlockData } from './SectionBlockContext';

export function FrontendContactFormSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const fields = ((settings['fields'] as string) || 'name,email,message')
    .split(',')
    .map((f: string) => f.trim())
    .filter(Boolean);
  const submitText = (settings['submitText'] as string) || 'Send message';

  return (
    <section style={sectionStyles}>
      <div
        className={getSectionContainerClass({
          fullWidth: layout?.fullWidth,
          maxWidthClass: 'max-w-xl',
        })}
      >
        <form onSubmit={(e: React.FormEvent) => e.preventDefault()} className='space-y-4'>
          {fields.map((field: string) => {
            const isTextarea = field.toLowerCase() === 'message';
            const label = field.charAt(0).toUpperCase() + field.slice(1);
            const fieldId = `contact-${field.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

            return (
              <div key={field}>
                <label
                  htmlFor={fieldId}
                  className='cms-appearance-muted-text mb-1.5 block text-sm font-medium'
                >
                  {label}
                </label>
                {isTextarea ? (
                  <textarea
                    id={fieldId}
                    rows={4}
                    placeholder={label}
                    aria-label={label}
                    className='cms-appearance-input w-full rounded-md border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    readOnly
                  />
                ) : (
                  <input
                    id={fieldId}
                    type={field.toLowerCase() === 'email' ? 'email' : 'text'}
                    placeholder={label}
                    aria-label={label}
                    className='cms-appearance-input w-full rounded-md border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    readOnly
                  />
                )}
              </div>
            );
          })}
          <button
            type='submit'
            className='cms-hover-button cms-appearance-button-primary w-full rounded-md border px-6 py-2.5 text-sm font-semibold transition'
            aria-label={submitText}
          >
            {submitText}
          </button>
        </form>
      </div>
    </section>
  );
}
