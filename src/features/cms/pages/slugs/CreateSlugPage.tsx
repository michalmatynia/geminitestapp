'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';



import { useCreateSlug } from '@/features/cms/hooks/useCmsQueries';
import { logClientError } from '@/features/observability';
import { SLUG_REGEX } from '@/features/cms/validations/slug';
import { Button, Input, Label, SectionHeader } from '@/shared/ui';

export default function CreateSlugPage(): React.JSX.Element {
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
      const next = domainId ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}` : '/admin/cms/slugs';
      router.push(next);
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'CreateSlugPage', action: 'createSlug', slug, domainId } });
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader title='Create Slug' className='mb-6' />
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
        <div className='mb-4'>
          <Label htmlFor='slug'>Slug</Label>
          <Input
            id='slug'
            value={slug}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSlug(e.target.value)}
            placeholder='e.g., my-awesome-page'
            required
          />
          {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
        </div>
        <Button type='submit'>Create</Button>
      </form>
    </div>
  );
}
