import React from 'react';
import type { Company, JobListing, JobScanRecord } from '@/shared/contracts/job-board';
import { statusBadge, promotionStatusBadge, formatSalary, type PromotionLogEntry } from './JobBoardUtils';

export function ScansTable({
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
                    {scan.createdAt !== null ? new Date(scan.createdAt).toLocaleString() : '—'}
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

export function CompaniesTable({
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
                    {primary !== null ? (
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

export function ListingsTable({
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

export function PromotionsTable({
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
                    {entry.completedAt !== null
                      ? new Date(entry.completedAt).toLocaleString()
                      : entry.startedAt !== null
                        ? new Date(entry.startedAt).toLocaleString()
                        : '—'}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2 text-slate-500'>
                    {entry.durationMs !== null ? `${entry.durationMs} ms` : '—'}
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
