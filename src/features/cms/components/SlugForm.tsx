'use client';

import React, { useState } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { SLUG_REGEX } from '@/features/cms/validations/slug';
import type { CmsDomain } from '@/shared/contracts/cms';
import { Input } from '@/shared/ui/primitives.public';
import { ToggleRow, FormSection, FormField, FormActions } from '@/shared/ui/forms-and-actions.public';
import { SearchableList } from '@/shared/ui/data-display.public';

export type SlugFormSubmitData = {
  slug: string;
  isDefault: boolean;
  domainIds: string[];
};

export interface SlugFormProps {
  initialData?: {
    slug: string;
    isDefault: boolean;
    domainIds: string[];
  };
  onSubmit: (data: SlugFormSubmitData) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
  submitText: string;
  domains: CmsDomain[];
}

export function SlugForm(props: SlugFormProps): React.JSX.Element {
  const { initialData, onSubmit, isSaving, onCancel, submitText, domains } = props;

  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [domainIds, setDomainIds] = useState<string[]>(initialData?.domainIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const { zoningEnabled } = useCmsDomainSelection();
  const slugInputRef = React.useCallback((node: HTMLInputElement | null): void => {
    node?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!SLUG_REGEX.test(slug)) {
      setError('Invalid slug format. Use only lowercase letters, numbers, and hyphens.');
      return;
    }
    setError(null);
    void onSubmit({ slug, isDefault, domainIds });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-6'>
        <FormSection title='Path Configuration' className='p-6'>
          <div className='space-y-4'>
            <FormField
              label='Slug'
              error={error}
              description='URL segment for this route.'
              required
            >
              <Input
                ref={slugInputRef}
                id='slug'
                value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
                placeholder='e.g. my-awesome-page'
                className='h-9'
               aria-label='e.g. my-awesome-page' title='e.g. my-awesome-page'/>
            </FormField>

            <ToggleRow
              label='Set as Default'
              description='Use this route if no path matches exactly'
              checked={isDefault}
              onCheckedChange={setIsDefault}
              className='bg-white/5 border-white/5'
            />
          </div>
        </FormSection>

        {zoningEnabled && (
          <FormSection
            title='Zone Availability'
            description='Assign this route to specific hostnames.'
            className='p-6'
          >
            <SearchableList
              items={domains}
              selectedIds={domainIds}
              onToggle={(id) => {
                setDomainIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              getId={(d) => d.id}
              getLabel={(d) => d.domain}
              searchPlaceholder='Filter domains...'
              emptyMessage='No domains available for assignment.'
              maxHeight='max-h-48'
              countLabel='selected'
              renderItem={(domain) => (
                <div className='flex flex-col'>
                  <span className='text-sm text-gray-300'>{domain.domain}</span>
                  {domain.aliasOf && (
                    <span className='text-[10px] text-gray-500 italic'>
                      Alias of {domains.find((d) => d.id === domain.aliasOf)?.domain}
                    </span>
                  )}
                </div>
              )}
            />
          </FormSection>
        )}

        <FormActions
          onCancel={onCancel}
          saveText={submitText}
          isSaving={isSaving}
          className='pt-4'
        />
      </div>
    </form>
  );
}
