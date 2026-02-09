'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';




import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsDomains, useCmsSlug, useCmsSlugDomains, useUpdateSlug, useUpdateSlugDomains } from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain, Slug } from '@/features/cms/types';
import { Button, Input, Label, Switch, SectionHeader, Checkbox } from '@/shared/ui';

export default function EditSlugPageLoader(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domainId') ?? undefined;
  const slugQuery = useCmsSlug(id, domainId);

  if (slugQuery.isLoading || !slugQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditSlugForm initialSlug={slugQuery.data} id={id} {...(domainId && { domainId })} />;
}

function EditSlugForm({
  initialSlug,
  id,
  domainId,
}: {
  initialSlug: Slug;
  id: string;
  domainId?: string;
}): React.JSX.Element {
  const [slug, setSlug] = useState<Slug>(initialSlug);
  const { zoningEnabled } = useCmsDomainSelection();
  const domainsQuery = useCmsDomains();
  const slugDomainsQuery = useCmsSlugDomains(id);
  const updateSlugDomains = useUpdateSlugDomains();
  const [domainSelection, setDomainSelection] = useState<string[] | null>(null);
  const domains = useMemo((): CmsDomain[] => domainsQuery.data ?? [], [domainsQuery.data]);
  const selectedDomainIds = domainSelection ?? slugDomainsQuery.data?.domainIds ?? [];
  const router = useRouter();
  const updateSlug = useUpdateSlug();

  useEffect(() => {
    if (!zoningEnabled) return;
    if (!slugDomainsQuery.data) return;
    if (domainSelection !== null) return;
    
    // Use a timeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      setDomainSelection(slugDomainsQuery.data.domainIds);
    }, 0);
    
    return (): void => clearTimeout(timer);
  }, [slugDomainsQuery.data, domainSelection, zoningEnabled]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!slug) return;

    if (zoningEnabled && selectedDomainIds.length === 0) {
      alert('Assign this slug to at least one zone.');
      return;
    }

    const updateData: { id: string; input: Partial<Slug>; domainId?: string | null } = { id, input: slug };
    if (domainId) updateData.domainId = domainId;
    await updateSlug.mutateAsync(updateData);
    if (zoningEnabled) {
      await updateSlugDomains.mutateAsync({ id, domainIds: selectedDomainIds });
    }
    const next = domainId ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}` : '/admin/cms/slugs';
    router.push(next);
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader title='Edit Slug' className='mb-6' />
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
        <div className='mb-4'>
          <Label htmlFor='slug'>Slug</Label>
          <Input
            id='slug'
            value={slug.slug}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSlug({ ...slug, slug: e.target.value })}
            required
          />
        </div>
        <div className='mb-4 flex items-center'>
          <Switch
            id='isDefault'
            checked={Boolean(slug.isDefault)}
            onCheckedChange={(checked: boolean): void => setSlug({ ...slug, isDefault: checked })}
          />
          <Label htmlFor='isDefault' className='ml-2'>
            Set as default
          </Label>
        </div>
        {zoningEnabled ? (
          <div className='mb-6 space-y-2 rounded border border-border/50 bg-gray-900/40 p-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm'>Zones using this slug</Label>
              <span className='text-xs text-muted-foreground'>
                {selectedDomainIds.length} selected
              </span>
            </div>
            <div className='max-h-48 space-y-2 overflow-y-auto rounded border border-border/50 bg-gray-950/40 p-2'>
              {domains.length === 0 ? (
                <p className='py-3 text-center text-xs text-muted-foreground'>No zones available.</p>
              ) : (
                domains.map((domain: CmsDomain) => {
                  const checked = selectedDomainIds.includes(domain.id);
                  return (
                    <label key={domain.id} className='flex items-center gap-2 text-sm text-gray-200'>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setDomainSelection((prev: string[] | null): string[] => {
                            const current = prev ?? selectedDomainIds;
                            return checked
                              ? current.filter((idValue: string): boolean => idValue !== domain.id)
                              : [...current, domain.id];
                          });
                        }}
                      />
                      {domain.domain}
                      {domain.aliasOf ? (
                        <span className='text-[11px] text-muted-foreground'>
                          (alias of {domains.find((item: CmsDomain) => item.id === domain.aliasOf)?.domain ?? 'zone'})
                        </span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Assign this slug to multiple zones to reuse the same path across hostnames.
            </p>
          </div>
        ) : null}
        <Button type='submit'>Update</Button>
      </form>
    </div>
  );
}
