'use client';

import { useMemo, useState } from 'react';

import {
  useCmsDomains,
  useCreateCmsDomain,
  useDeleteCmsDomain,
  useUpdateCmsDomain,
} from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain } from '@/features/cms/types';
import { logClientError } from '@/features/observability';
import {
  Button,
  Input,
  Label,
  ListPanel,
  EmptyState,
  useToast,
  SelectSimple,
} from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

import { cmsDomainCreateSchema, cmsDomainUpdateSchema } from '../../validations/api';

export default function ZonesPage(): React.JSX.Element {
  const domainsQuery = useCmsDomains();
  const createDomain = useCreateCmsDomain();
  const deleteDomain = useDeleteCmsDomain();
  const updateDomain = useUpdateCmsDomain();
  const { toast } = useToast();
  const domains = useMemo((): CmsDomain[] => domainsQuery.data ?? [], [domainsQuery.data]);
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validation = validateFormData(
      cmsDomainCreateSchema,
      { domain },
      'Enter a domain or hostname.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError('');
    try {
      await createDomain.mutateAsync(validation.data);
      setDomain('');
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ZonesPage', action: 'createDomain', domain } });
      setError(err instanceof Error ? err.message : 'Failed to create domain.');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Remove this domain and its slug assignments?')) return;
    try {
      await deleteDomain.mutateAsync(id);
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ZonesPage', action: 'deleteDomain', domainId: id } });
      logClientError(err, { context: { source: 'ZonesPage', action: 'deleteDomain', domainId: id } });
      toast(err instanceof Error ? err.message : 'Failed to delete domain.', { variant: 'error' });
    }
  };

  const handleAliasChange = async (id: string, aliasOfValue: string): Promise<void> => {
    const aliasOf = aliasOfValue === 'none' ? null : aliasOfValue;
    const validation = validateFormData(
      cmsDomainUpdateSchema,
      { aliasOf },
      'Alias selection is invalid.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    try {
      const input = validation.data.aliasOf === undefined ? {} : { aliasOf: validation.data.aliasOf };
      await updateDomain.mutateAsync({ id, input });
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ZonesPage', action: 'updateAlias', domainId: id, aliasOf } });
      logClientError(err, { context: { source: 'ZonesPage', action: 'updateAlias', domainId: id, aliasOf } });
      toast(err instanceof Error ? err.message : 'Failed to update alias.', { variant: 'error' });
    }
  };

  return (
    <div className='container mx-auto py-10'>
      <ListPanel
        title='Zones (Domains)'
        description='Zones scope CMS slugs per hostname. Domains are auto-created on first request; add here to pre-provision or share slug sets.'
        isLoading={domainsQuery.isLoading}
        emptyState={
          <EmptyState
            title='No zones yet'
            description='Create one or visit a domain to auto-register it.'
          />
        }
      >
        <form
          onSubmit={(event: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(event); }}
          className='flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end'
        >
          <div className='flex-1'>
            <Label htmlFor='domain'>Domain</Label>
            <Input
              id='domain'
              value={domain}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setDomain(event.target.value)}
              placeholder='milkbar.com'
              autoComplete='off'
            />
            {error ? <p className='mt-1 text-sm text-red-500'>{error}</p> : null}
          </div>
          <Button type='submit' size='sm'>
            Add Zone
          </Button>
        </form>

        <ul className='divide-y divide-border'>
          {domains.map((item: CmsDomain) => (
            <li key={item.id} className='flex items-center justify-between px-4 py-3'>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-medium'>{item.domain}</span>
                {item.aliasOf ? (
                  <span className='text-xs text-muted-foreground'>
                    Shares slugs with {domains.find((d: CmsDomain) => d.id === item.aliasOf)?.domain ?? 'another zone'}
                  </span>
                ) : (
                  <span className='text-xs text-muted-foreground'>Independent zone</span>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <SelectSimple
                  value={item.aliasOf ?? 'none'}
                  onValueChange={(value: string): void => { void handleAliasChange(item.id, value); }}
                  options={[
                    { value: 'none', label: 'Independent zone' },
                    ...domains
                      .filter((domainOption: CmsDomain) => domainOption.id !== item.id)
                      .map((domainOption: CmsDomain) => ({
                        value: domainOption.id,
                        label: `Share with ${domainOption.domain}`,
                      })),
                  ]}
                  size='sm'
                  className='w-[220px]'
                  placeholder='Independent zone'
                />
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => { void handleDelete(item.id); }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
