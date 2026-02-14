'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsDomains, useCmsSlug, useCmsSlugDomains, useUpdateSlug, useUpdateSlugDomains } from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain, Slug } from '@/features/cms/types';
import {
  cmsSlugDomainsUpdateSchema,
  cmsSlugUpdateSchema,
} from '@/features/cms/validations/api';
import { Button, Input, Switch, SectionHeader, Checkbox, FormSection, FormField, Badge, useToast } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

export default function EditSlugPageLoader(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domainId') ?? undefined;
  const slugQuery = useCmsSlug(id, domainId);

  if (slugQuery.isLoading || !slugQuery.data) {
    return <div className='p-12 text-center text-sm text-gray-500 animate-pulse'>Loading route configuration...</div>;
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
  const { toast } = useToast();
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zoningEnabled) return;
    if (!slugDomainsQuery.data) return;
    if (domainSelection !== null) return;
    
    const timer = setTimeout(() => {
      setDomainSelection(slugDomainsQuery.data.domainIds);
    }, 0);
    
    return (): void => clearTimeout(timer);
  }, [slugDomainsQuery.data, domainSelection, zoningEnabled]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!slug) return;

    const slugValidation = validateFormData(
      cmsSlugUpdateSchema,
      {
        slug: slug.slug,
        isDefault: Boolean(slug.isDefault),
      },
      'Slug form is invalid.',
    );
    if (!slugValidation.success) {
      setError(slugValidation.firstError);
      return;
    }

    if (zoningEnabled) {
      const domainsValidation = validateFormData(
        cmsSlugDomainsUpdateSchema,
        { domainIds: selectedDomainIds },
        'Assign this slug to at least one zone.',
      );
      if (!domainsValidation.success) {
        setError(domainsValidation.firstError);
        return;
      }
    }

    setError(null);
    const slugInput: Partial<Slug> = {
      slug: slugValidation.data.slug,
      ...(typeof slugValidation.data.isDefault === 'boolean'
        ? { isDefault: slugValidation.data.isDefault }
        : {}),
    };
    const updateData: { id: string; input: Partial<Slug>; domainId?: string | null } = {
      id,
      input: slugInput,
    };
    if (domainId) updateData.domainId = domainId;
    
    try {
      await updateSlug.mutateAsync(updateData);
      if (zoningEnabled) {
        await updateSlugDomains.mutateAsync({ id, domainIds: selectedDomainIds });
      }
      toast('Route path updated successfully.', { variant: 'success' });
      const next = domainId ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}` : '/admin/cms/slugs';
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-2xl space-y-6'>
      <SectionHeader 
        title='Edit Route' 
        description='Configure path behavior and cross-domain assignments.'
        eyebrow='CMS · Routing'
      />
      
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
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
                  id='slug'
                  value={slug.slug}
                  onChange={(e) => setSlug({ ...slug, slug: e.target.value })}
                  className='h-9'
                />
              </FormField>

              <label className='flex items-center gap-3 p-3 rounded-md border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                <Switch
                  id='isDefault'
                  checked={Boolean(slug.isDefault)}
                  onCheckedChange={(checked) => setSlug({ ...slug, isDefault: checked })}
                />
                <div className='flex flex-col'>
                  <span className='text-sm font-medium text-gray-200'>Set as Default</span>
                  <span className='text-[10px] text-gray-500 uppercase'>Use this route if no path matches exactly</span>
                </div>
              </label>
            </div>
          </FormSection>

          {zoningEnabled && (
            <FormSection 
              title='Zone Availability' 
              description='Assign this route to specific hostnames.'
              className='p-6'
            >
              <div className='space-y-3'>
                <div className='flex justify-between items-center px-1'>
                  <span className='text-[10px] uppercase font-bold text-gray-500'>Assigned Domains</span>
                  <Badge variant='secondary' className='text-[9px]'>{selectedDomainIds.length} selected</Badge>
                </div>
                
                <div className='max-h-48 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 divide-y divide-white/5'>
                  {domains.length === 0 ? (
                    <div className='py-8 text-center text-xs text-gray-600'>No domains available for assignment.</div>
                  ) : (
                    domains.map((domain) => {
                      const checked = selectedDomainIds.includes(domain.id);
                      return (
                        <label key={domain.id} className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors'>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setDomainSelection((prev) => {
                                const current = prev ?? selectedDomainIds;
                                return checked
                                  ? current.filter((id) => id !== domain.id)
                                  : [...current, domain.id];
                              });
                            }}
                          />
                          <div className='flex flex-col'>
                            <span className='text-sm text-gray-300'>{domain.domain}</span>
                            {domain.aliasOf && (
                              <span className='text-[10px] text-gray-500 italic'>Alias of {domains.find(d => d.id === domain.aliasOf)?.domain}</span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </FormSection>
          )}

          <div className='flex justify-end gap-3 pt-4'>
            <Button 
              type='button' 
              variant='outline' 
              size='sm' 
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={updateSlug.isPending || updateSlugDomains.isPending}>
              {updateSlug.isPending || updateSlugDomains.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
