'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  Company,
  FilemakerOrganisationHit,
  OrganisationSearchResponse,
  PromoteCompanyResponse,
} from '@/shared/contracts/job-board';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

const SEARCH_ENDPOINT = '/api/v2/jobs/organisations';

export type PromoteToOrganiserDialogProps = {
  company: Company | null;
  open: boolean;
  onClose: () => void;
  onPromoted?: (result: PromoteCompanyResponse) => void;
};

export function PromoteToOrganiserDialog({
  company,
  open,
  onClose,
  onPromoted,
}: PromoteToOrganiserDialogProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<FilemakerOrganisationHit[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromoteCompanyResponse | null>(null);

  // Seed query with the company name when the dialog opens; preselect all emails.
  useEffect(() => {
    if (!open) return;
    setQuery(company?.name ?? '');
    setSelectedAddresses(new Set((company?.emails ?? []).map((e) => e.address)));
    setHits([]);
    setError(null);
    setResult(null);
  }, [open, company]);

  const runSearch = useCallback(
    async (search: string): Promise<void> => {
      const trimmed = search.trim();
      if (trimmed.length < 2) {
        setHits([]);
        return;
      }
      setIsSearching(true);
      setError(null);
      try {
        const response = await fetch(
          `${SEARCH_ENDPOINT}?q=${encodeURIComponent(trimmed)}&limit=20`,
          { cache: 'no-store' }
        );
        if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
        const body = (await response.json()) as OrganisationSearchResponse;
        setHits(body.hits);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Debounced auto-search.
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [open, query, runSearch]);

  const handlePromote = useCallback(
    async (organizationId: string): Promise<void> => {
      if (!company) return;
      setIsPromoting(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v2/jobs/companies/${encodeURIComponent(company.id)}/promote`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              addresses: [...selectedAddresses],
            }),
          }
        );
        const body = (await response.json()) as PromoteCompanyResponse | { error?: string };
        if (!response.ok) {
          throw new Error(
            (body as { error?: string }).error ?? `Promote HTTP ${response.status}`
          );
        }
        setResult(body as PromoteCompanyResponse);
        onPromoted?.(body as PromoteCompanyResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsPromoting(false);
      }
    },
    [company, selectedAddresses, onPromoted]
  );

  const toggleAddress = (address: string): void => {
    setSelectedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='max-h-[85vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Promote to Filemaker organisation</DialogTitle>
          <DialogDescription>
            Search for the matching CRM organisation and write the scraped emails into{' '}
            <code className='rounded bg-slate-100 px-1'>filemaker_emails</code> with a link to the
            organisation. Existing emails are reused; existing links are left untouched.
          </DialogDescription>
        </DialogHeader>

        {!company ? (
          <p className='text-sm text-slate-500'>No company selected.</p>
        ) : (
          <div className='space-y-4'>
            <section>
              <h3 className='mb-1 text-sm font-semibold text-slate-700'>
                Emails to promote ({selectedAddresses.size} selected)
              </h3>
              {company.emails.length === 0 ? (
                <p className='text-sm text-slate-500'>No emails were scraped for this company.</p>
              ) : (
                <ul className='space-y-1 text-sm'>
                  {company.emails.map((email) => (
                    <li key={email.address} className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={selectedAddresses.has(email.address)}
                        onChange={() => toggleAddress(email.address)}
                      />
                      <span>{email.address}</span>
                      {email.isPrimary ? (
                        <span className='inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800'>
                          primary
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className='mb-1 text-sm font-semibold text-slate-700'>Find organisation</h3>
              <Input
                placeholder='Name, NIP, or KRS'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className='mt-2 max-h-72 overflow-y-auto rounded border border-slate-200'>
                {isSearching ? (
                  <p className='p-3 text-sm text-slate-500'>Searching…</p>
                ) : hits.length === 0 ? (
                  <p className='p-3 text-sm text-slate-500'>
                    {query.trim().length < 2 ? 'Type at least 2 characters.' : 'No matches.'}
                  </p>
                ) : (
                  <ul className='divide-y divide-slate-100'>
                    {hits.map((hit) => (
                      <li
                        key={hit.id}
                        className='flex items-start justify-between gap-3 p-3 text-sm hover:bg-slate-50'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='font-medium'>{hit.name}</div>
                          <div className='text-xs text-slate-500'>
                            {hit.taxId ? `NIP ${hit.taxId} · ` : ''}
                            {hit.krs ? `KRS ${hit.krs} · ` : ''}
                            {hit.city ?? ''}
                          </div>
                          {hit.tradingName ? (
                            <div className='text-xs text-slate-500'>{hit.tradingName}</div>
                          ) : null}
                        </div>
                        <Button
                          type='button'
                          size='sm'
                          disabled={isPromoting || selectedAddresses.size === 0}
                          onClick={() => void handlePromote(hit.id)}
                        >
                          {isPromoting ? 'Saving…' : 'Promote'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {error ? (
              <div className='rounded border border-rose-300 bg-rose-50 p-2 text-sm text-rose-800'>
                {error}
              </div>
            ) : null}

            {result ? (
              <div className='rounded border border-emerald-300 bg-emerald-50 p-3 text-sm'>
                <div className='font-medium text-emerald-900'>
                  Promoted to {result.organizationName}
                </div>
                <ul className='mt-1 list-disc space-y-0.5 pl-5 text-emerald-800'>
                  {result.promoted.map((p) => (
                    <li key={p.linkId}>
                      {p.address} — {p.status.replace('-', ' ')}
                    </li>
                  ))}
                  {result.skipped.map((s, idx) => (
                    <li key={`skipped-${idx}`} className='text-amber-800'>
                      {s.address}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
