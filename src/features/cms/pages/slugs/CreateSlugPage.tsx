'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useCreateSlug } from '@/features/cms/hooks/useCmsQueries';
import { SLUG_REGEX } from '@/features/cms/validations/slug';
import { logClientError } from '@/features/observability';
import { Input, SectionHeader, FormSection, FormField, useToast, FormActions } from '@/shared/ui';

export default function CreateSlugPage(): React.JSX.Element {
  const { toast } = useToast();
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domainId') ?? undefined;
  const createSlug = useCreateSlug();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!SLUG_REGEX.test(slug)) {
      setError(
        'Invalid slug format. Use only lowercase letters, numbers, and hyphens.'
      );
      return;
    }

    try {
      const createData: { slug: string; domainId?: string | null } = { slug };
      if (domainId) createData.domainId = domainId;
      await createSlug.mutateAsync(createData);
      toast('Route path created successfully.', { variant: 'success' });
      const next = domainId ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}` : '/admin/cms/slugs';
      router.push(next);
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'CreateSlugPage', action: 'createSlug', slug, domainId } });
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-2xl space-y-6'>
      <SectionHeader 
        title='Create Route' 
        description='Register a new URL path for your content.'
        eyebrow='CMS · Routing'
      />
      
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
        <FormSection title='Path Details' className='p-6'>
          <FormField 
            label='Slug' 
            error={error} 
            description='This will be the URL segment (e.g. "about-us" becomes /about-us)'
            required
          >
            <Input
              id='slug'
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSlug(e.target.value)}
              placeholder='e.g. my-awesome-page'
              className='h-9'
              autoFocus
            />
          </FormField>
          
          <FormActions
            onCancel={() => router.back()}
            saveText='Create Path'
            isSaving={createSlug.isPending}
            className='pt-4'
          />
        </FormSection>
      </form>
    </div>
  );
}
