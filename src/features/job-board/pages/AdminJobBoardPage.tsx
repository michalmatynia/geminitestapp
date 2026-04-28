'use client';

import { Briefcase } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import type {
  Company,
  CompanyListResponse,
  JobListing,
  JobListingListResponse,
  JobScanCreateResponse,
  JobScanListResponse,
  JobScanRecord,
} from '@/shared/contracts/job-board';
import { AdminJobBoardPageLayout } from '@/shared/ui/admin-job-board-page-layout';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

import { JobScanDetailDialog } from './JobScanDetailDialog';

const SCANS_ENDPOINT = '/api/v2/jobs/scans';
const COMPANIES_ENDPOINT = '/api/v2/jobs/companies';
const LISTINGS_ENDPOINT = '/api/v2/jobs/listings';

type Tab = 'scans' | 'companies' | 'listings' | 'promotions';

type PromotionLogEntry = {
  scanId: string;
  scanSourceUrl: string;
  companyId: string | null;
  companyName: string | null;
  kind: 'auto' | 'manual';
  status: 'completed' | 'skipped' | 'failed' | 'pending' | 'running';
  message: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
};

const PROMOTION_STEP_KEYS: Record<string, PromotionLogEntry['kind']> = {
  auto_promote: 'auto',
  manual_promote: 'manual',
};

const collectPromotionLog = (scans: JobScanRecord[], companies: Company[]): PromotionLogEntry[] => {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const entries: PromotionLogEntry[] = [];
  for (const scan of scans) {
    for (const step of scan.steps) {
      const kind = PROMOTION_STEP_KEYS[step.key];
      if (!kind) continue;
      const company = scan.companyId ? companyById.get(scan.companyId) ?? null : null;
      entries.push({
        scanId: scan.id,
        scanSourceUrl: scan.sourceUrl,
        companyId: scan.companyId,
        companyName:
          company?.name ??
          ((scan.evaluation?.company as Record<string, unknown> | null)?.['name'] as
            | string
            | undefined) ??
          null,
        kind,
        status: step.status,
        message: step.message,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        durationMs: step.durationMs,
      });
    }
  }
  return entries.sort((a, b) => {
    const aTs = a.completedAt ? Date.parse(a.completedAt) : 0;
    const bTs = b.completedAt ? Date.parse(b.completedAt) : 0;
    return bTs - aTs;
  });
};

const promotionStatusBadge = (status: PromotionLogEntry['status']): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'skipped':
      return 'bg-slate-100 text-slate-700';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

const statusBadge = (status: JobScanRecord['status']): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'running':
    case 'queued':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    case 'no_match':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const formatSalary = (salary: JobListing['salary']): string => {
  if (!salary) return '—';
  if (salary.raw) return salary.raw;
  const min = salary.min;
  const max = salary.max;
  const currency = salary.currency ?? '';
  const period = salary.period ? ` / ${salary.period}` : '';
  if (min != null && max != null) return `${min}–${max} ${currency}${period}`.trim();
  if (min != null) return `from ${min} ${currency}${period}`.trim();
  if (max != null) return `up to ${max} ${currency}${period}`.trim();
  return '—';
};

export function AdminJobBoardPage(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('scans');
  const [sourceUrl, setSourceUrl] = useState('');
  const [scans, setScans] = useState<JobScanRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<JobScanRecord | null>(null);

  const loadAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const [scansRes, companiesRes, listingsRes] = await Promise.all([
        fetch(SCANS_ENDPOINT, { cache: 'no-store' }),
        fetch(COMPANIES_ENDPOINT, { cache: 'no-store' }),
        fetch(LISTINGS_ENDPOINT, { cache: 'no-store' }),
      ]);
      if (!scansRes.ok) throw new Error(`Scans HTTP ${scansRes.status}`);
      if (!companiesRes.ok) throw new Error(`Companies HTTP ${companiesRes.status}`);
      if (!listingsRes.ok) throw new Error(`Listings HTTP ${listingsRes.status}`);
      const scansBody = (await scansRes.json()) as JobScanListResponse;
      const companiesBody = (await companiesRes.json()) as CompanyListResponse;
      const listingsBody = (await listingsRes.json()) as JobListingListResponse;
      setScans(scansBody.scans);
      setCompanies(companiesBody.companies);
      setListings(listingsBody.listings);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const hasActiveScan = scans.some((s) => s.status === 'queued' || s.status === 'running');

  useEffect(() => {
    if (!hasActiveScan) return;
    const handle = window.setInterval(() => {
      void loadAll();
    }, 3000);
    return () => window.clearInterval(handle);
  }, [hasActiveScan, loadAll]);

  // Keep the open scan-detail dialog's data in sync with refreshed scans (e.g. after a manual
  // promote appends a `manual_promote` step). Compare by id so a stale closure-captured object
  // doesn't suppress the update.
  useEffect(() => {
    if (!selectedScan) return;
    const refreshed = scans.find((s) => s.id === selectedScan.id);
    if (refreshed && refreshed !== selectedScan) {
      setSelectedScan(refreshed);
    }
  }, [scans, selectedScan]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const url = sourceUrl.trim();
      if (!url) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch(SCANS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl: url }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Submit failed (HTTP ${response.status})`);
        }
        const body = (await response.json()) as JobScanCreateResponse;
        setScans((prev) => [body.scan, ...prev.filter((s) => s.id !== body.scan.id)]);
        setSourceUrl('');
        void loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [sourceUrl, loadAll]
  );

  const handleCompanyUpdated = useCallback((updatedCompany: Company): void => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === updatedCompany.id ? updatedCompany : company
      )
    );
  }, []);

  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
  const promotionLog = collectPromotionLog(scans, companies);

  return (
    <AdminJobBoardPageLayout
      title='Job Board Scraper'
      current='Job Board Scraper'
      description='Scrape job offers (e.g. pracuj.pl), extract company + listing data with AI, and persist them.'
      icon={<Briefcase className='size-4' />}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'
      >
        <Input
          type='url'
          required
          placeholder='https://www.pracuj.pl/praca/...'
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          className='flex-1'
        />
        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Scanning...' : 'Scrape & save'}
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={isLoading}
            onClick={() => void loadAll()}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </form>

      {error ? (
        <div className='mb-4 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800'>
          {error}
        </div>
      ) : null}

      <div className='mb-4 flex gap-2 border-b border-slate-200'>
        {(['scans', 'companies', 'listings', 'promotions'] as Tab[]).map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === value
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {value} (
            {value === 'scans'
              ? scans.length
              : value === 'companies'
                ? companies.length
                : value === 'listings'
                  ? listings.length
                  : promotionLog.length}
            )
          </button>
        ))}
      </div>

      {tab === 'scans' ? (
        <ScansTable scans={scans} isLoading={isLoading} onSelect={setSelectedScan} />
      ) : tab === 'companies' ? (
        <CompaniesTable companies={companies} isLoading={isLoading} />
      ) : tab === 'listings' ? (
        <ListingsTable
          listings={listings}
          isLoading={isLoading}
          companyNameById={companyNameById}
        />
      ) : (
        <PromotionsTable
          entries={promotionLog}
          isLoading={isLoading}
          onSelectScan={(scanId) => {
            const scan = scans.find((s) => s.id === scanId);
            if (scan) setSelectedScan(scan);
          }}
        />
      )}

      <JobScanDetailDialog
        scan={selectedScan}
        company={
          selectedScan?.companyId
            ? companies.find((c) => c.id === selectedScan.companyId) ?? null
            : null
        }
        onClose={() => setSelectedScan(null)}
        onCompanyUpdated={handleCompanyUpdated}
        onPromoted={() => {
          void loadAll();
        }}
      />
    </AdminJobBoardPageLayout>
  );
}

function ScansTable({
  scans,
  isLoading,
  onSelect,
}: {
  scans: JobScanRecord[];
  isLoading: boolean;
  onSelect: (scan: JobScanRecord) => void;
}): React.JSX.Element {
  return (
    <div className='overflow-x-auto rounded-lg border border-slate-200'>
      <table className='min-w-full divide-y divide-slate-200 text-sm'>
        <thead className='bg-slate-50 text-left'>
          <tr>
            <th className='px-4 py-2 font-medium'>Status</th>
            <th className='px-4 py-2 font-medium'>Job title</th>
            <th className='px-4 py-2 font-medium'>Company</th>
            <th className='px-4 py-2 font-medium'>Source URL</th>
            <th className='px-4 py-2 font-medium'>Confidence</th>
            <th className='px-4 py-2 font-medium'>Created</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100 bg-white'>
          {scans.length === 0 ? (
            <tr>
              <td colSpan={6} className='px-4 py-8 text-center text-slate-500'>
                {isLoading ? 'Loading...' : 'No scans yet. Submit a URL above to start.'}
              </td>
            </tr>
          ) : (
            scans.map((scan) => {
              const listing = (scan.evaluation?.listing as Record<string, unknown> | null) ?? null;
              const company = (scan.evaluation?.company as Record<string, unknown> | null) ?? null;
              const title = (listing?.['title'] as string | undefined) ?? '—';
              const companyName = (company?.['name'] as string | undefined) ?? '—';
              const confidence = scan.evaluation?.confidence;
              return (
                <tr
                  key={scan.id}
                  className='cursor-pointer hover:bg-slate-50'
                  onClick={() => onSelect(scan)}
                >
                  <td className='px-4 py-2'>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusBadge(
                        scan.status
                      )}`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td className='max-w-xs truncate px-4 py-2'>{title}</td>
                  <td className='max-w-xs truncate px-4 py-2'>{companyName}</td>
                  <td className='max-w-md truncate px-4 py-2'>
                    <a
                      href={scan.sourceUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-blue-600 hover:underline'
                      onClick={(event) => event.stopPropagation()}
                    >
                      {scan.sourceUrl}
                    </a>
                  </td>
                  <td className='px-4 py-2'>
                    {typeof confidence === 'number' ? confidence.toFixed(2) : '—'}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2 text-slate-500'>
                    {scan.createdAt ? new Date(scan.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function CompaniesTable({
  companies,
  isLoading,
}: {
  companies: Company[];
  isLoading: boolean;
}): React.JSX.Element {
  return (
    <div className='overflow-x-auto rounded-lg border border-slate-200'>
      <table className='min-w-full divide-y divide-slate-200 text-sm'>
        <thead className='bg-slate-50 text-left'>
          <tr>
            <th className='px-4 py-2 font-medium'>Name</th>
            <th className='px-4 py-2 font-medium'>NIP</th>
            <th className='px-4 py-2 font-medium'>Domain</th>
            <th className='px-4 py-2 font-medium'>Email</th>
            <th className='px-4 py-2 font-medium'>City</th>
            <th className='px-4 py-2 font-medium'>Industry</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100 bg-white'>
          {companies.length === 0 ? (
            <tr>
              <td colSpan={6} className='px-4 py-8 text-center text-slate-500'>
                {isLoading ? 'Loading...' : 'No companies yet.'}
              </td>
            </tr>
          ) : (
            companies.map((company) => {
              const primary =
                company.emails.find((e) => e.isPrimary) ?? company.emails[0] ?? null;
              return (
                <tr key={company.id}>
                  <td className='px-4 py-2 font-medium'>{company.name}</td>
                  <td className='px-4 py-2'>{company.nip ?? '—'}</td>
                  <td className='px-4 py-2'>{company.domain ?? '—'}</td>
                  <td className='max-w-xs truncate px-4 py-2'>
                    {primary ? (
                      <a
                        href={`mailto:${primary.address}`}
                        className='text-blue-600 hover:underline'
                      >
                        {primary.address}
                      </a>
                    ) : (
                      <span className='text-slate-400'>—</span>
                    )}
                    {company.emails.length > 1 ? (
                      <span className='ml-1 text-xs text-slate-500'>
                        +{company.emails.length - 1}
                      </span>
                    ) : null}
                  </td>
                  <td className='px-4 py-2'>{company.city ?? '—'}</td>
                  <td className='px-4 py-2'>{company.industry ?? '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ListingsTable({
  listings,
  isLoading,
  companyNameById,
}: {
  listings: JobListing[];
  isLoading: boolean;
  companyNameById: Map<string, string>;
}): React.JSX.Element {
  return (
    <div className='overflow-x-auto rounded-lg border border-slate-200'>
      <table className='min-w-full divide-y divide-slate-200 text-sm'>
        <thead className='bg-slate-50 text-left'>
          <tr>
            <th className='px-4 py-2 font-medium'>Title</th>
            <th className='px-4 py-2 font-medium'>Company</th>
            <th className='px-4 py-2 font-medium'>Mode</th>
            <th className='px-4 py-2 font-medium'>Level</th>
            <th className='px-4 py-2 font-medium'>City</th>
            <th className='px-4 py-2 font-medium'>Salary</th>
            <th className='px-4 py-2 font-medium'>Source</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100 bg-white'>
          {listings.length === 0 ? (
            <tr>
              <td colSpan={7} className='px-4 py-8 text-center text-slate-500'>
                {isLoading ? 'Loading...' : 'No job listings yet.'}
              </td>
            </tr>
          ) : (
            listings.map((listing) => (
              <tr key={listing.id}>
                <td className='max-w-xs truncate px-4 py-2 font-medium'>{listing.title}</td>
                <td className='max-w-xs truncate px-4 py-2'>
                  {companyNameById.get(listing.companyId) ?? listing.companyId}
                </td>
                <td className='px-4 py-2'>{listing.workMode}</td>
                <td className='px-4 py-2'>{listing.experienceLevel}</td>
                <td className='px-4 py-2'>{listing.city ?? '—'}</td>
                <td className='px-4 py-2'>{formatSalary(listing.salary)}</td>
                <td className='max-w-xs truncate px-4 py-2'>
                  <a
                    href={listing.sourceUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-blue-600 hover:underline'
                  >
                    open
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PromotionsTable({
  entries,
  isLoading,
  onSelectScan,
}: {
  entries: PromotionLogEntry[];
  isLoading: boolean;
  onSelectScan: (scanId: string) => void;
}): React.JSX.Element {
  const completed = entries.filter((entry) => entry.status === 'completed').length;
  const skipped = entries.filter((entry) => entry.status === 'skipped').length;
  const failed = entries.filter((entry) => entry.status === 'failed').length;

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-3 text-sm'>
        <span className='inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-800'>
          {completed} completed
        </span>
        <span className='inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 font-medium text-slate-700'>
          {skipped} skipped
        </span>
        <span className='inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 font-medium text-rose-800'>
          {failed} failed
        </span>
      </div>
      <div className='overflow-x-auto rounded-lg border border-slate-200'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-left'>
            <tr>
              <th className='px-4 py-2 font-medium'>Status</th>
              <th className='px-4 py-2 font-medium'>Kind</th>
              <th className='px-4 py-2 font-medium'>Company</th>
              <th className='px-4 py-2 font-medium'>Outcome</th>
              <th className='px-4 py-2 font-medium'>Source URL</th>
              <th className='px-4 py-2 font-medium'>When</th>
              <th className='px-4 py-2 font-medium'>Duration</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 bg-white'>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-slate-500'>
                  {isLoading
                    ? 'Loading...'
                    : 'No promote attempts yet. Set JOB_BOARD_AUTO_PROMOTE_ON_NIP_MATCH=true for auto-promote, or use Promote to Organiser… in the scan detail.'}
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr
                  key={`${entry.scanId}-${idx}`}
                  className='cursor-pointer hover:bg-slate-50'
                  onClick={() => onSelectScan(entry.scanId)}
                >
                  <td className='px-4 py-2'>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${promotionStatusBadge(
                        entry.status
                      )}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className='px-4 py-2'>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        entry.kind === 'auto'
                          ? 'bg-violet-100 text-violet-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {entry.kind}
                    </span>
                  </td>
                  <td className='max-w-xs truncate px-4 py-2 font-medium'>
                    {entry.companyName ?? '—'}
                  </td>
                  <td className='max-w-md truncate px-4 py-2 text-slate-700'>
                    {entry.message ?? '—'}
                  </td>
                  <td className='max-w-xs truncate px-4 py-2'>
                    <a
                      href={entry.scanSourceUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-blue-600 hover:underline'
                      onClick={(event) => event.stopPropagation()}
                    >
                      {entry.scanSourceUrl}
                    </a>
                  </td>
                  <td className='whitespace-nowrap px-4 py-2 text-slate-500'>
                    {entry.completedAt
                      ? new Date(entry.completedAt).toLocaleString()
                      : entry.startedAt
                        ? new Date(entry.startedAt).toLocaleString()
                        : '—'}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2 text-slate-500'>
                    {entry.durationMs != null ? `${entry.durationMs} ms` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminJobBoardPage;
