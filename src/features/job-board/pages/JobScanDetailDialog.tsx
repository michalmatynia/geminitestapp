'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  Company,
  JobBoardRefreshCompanyEmailsResponse,
  JobScanRecord,
  JobScanStep,
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

import { PromoteToOrganiserDialog } from './PromoteToOrganiserDialog';

const REFRESH_EMAILS_ENDPOINT = '/api/v2/jobs/companies';

const stepStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'running':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    case 'skipped':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

const renderStringList = (value: unknown, emptyText: string): React.JSX.Element => {
  const list = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  if (list.length === 0) {
    return <p className='text-sm text-slate-500'>{emptyText}</p>;
  }
  return (
    <ul className='list-disc space-y-1 pl-5 text-sm'>
      {list.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
};

const renderField = (label: string, value: unknown): React.JSX.Element | null => {
  if (value == null || value === '') return null;
  const display =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs uppercase tracking-wide text-slate-500'>{label}</span>
      <span className='text-sm'>{display}</span>
    </div>
  );
};

export type JobScanDetailDialogProps = {
  scan: JobScanRecord | null;
  company: Company | null;
  onClose: () => void;
  onPromoted?: (result: PromoteCompanyResponse) => void;
  onCompanyUpdated?: (company: Company) => void;
};

export function JobScanDetailDialog({
  scan,
  company: persistedCompany,
  onClose,
  onPromoted,
  onCompanyUpdated,
}: JobScanDetailDialogProps): React.JSX.Element {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [isRefreshingEmails, setIsRefreshingEmails] = useState(false);
  const [refreshEmailHeadless, setRefreshEmailHeadless] = useState(true);
  const [refreshEmailError, setRefreshEmailError] = useState<string | null>(null);
  const [refreshEmailSteps, setRefreshEmailSteps] = useState<JobScanStep[]>([]);
  const [companyState, setCompanyState] = useState<Company | null>(persistedCompany);
  const open = scan !== null;
  const listing = (scan?.evaluation?.listing as Record<string, unknown> | null) ?? null;
  const salary = (listing?.['salary'] as Record<string, unknown> | null) ?? null;

  const company = companyState;

  useEffect(() => {
    setCompanyState(persistedCompany);
  }, [persistedCompany]);

  const runEmailRefresh = useCallback(async (options: { useVision: boolean }): Promise<void> => {
    if (!companyState) return;
    setIsRefreshingEmails(true);
    setRefreshEmailError(null);
    setRefreshEmailSteps([]);

    try {
      const response = await fetch(
        `${REFRESH_EMAILS_ENDPOINT}/${encodeURIComponent(companyState.id)}/refresh-emails`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            useVision: options.useVision,
            autoPromote: false,
            headless: refreshEmailHeadless,
          }),
        }
      );
      const body = (await response.json()) as
        | JobBoardRefreshCompanyEmailsResponse
        | { error?: string };
      if (!response.ok) {
        throw new Error(
          (body as { error?: string }).error ??
            `Re-run email finder failed (HTTP ${response.status})`
        );
      }
      const { company: refreshed, steps } = body as JobBoardRefreshCompanyEmailsResponse;
      setCompanyState(refreshed);
      setRefreshEmailSteps(steps);
      onCompanyUpdated?.(refreshed);
    } catch (error) {
      setRefreshEmailError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshingEmails(false);
    }
  }, [companyState, onCompanyUpdated, refreshEmailHeadless]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className='max-h-[85vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {(listing?.['title'] as string | undefined) ?? 'Job scan'}
          </DialogTitle>
          <DialogDescription>
            {scan ? (
              <a
                href={scan.sourceUrl}
                target='_blank'
                rel='noreferrer'
                className='text-blue-600 hover:underline'
              >
                {scan.sourceUrl}
              </a>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {scan ? (
          <div className='space-y-6'>
            <section>
              <h3 className='mb-2 text-sm font-semibold text-slate-700'>Scan</h3>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                {renderField('Status', scan.status)}
                {renderField('Provider', scan.provider)}
                {renderField('Confidence', scan.evaluation?.confidence)}
                {renderField('Model', scan.evaluation?.modelId)}
                {renderField('Company ID', scan.companyId)}
                {renderField('Listing ID', scan.jobListingId)}
                {renderField(
                  'Created',
                  scan.createdAt ? new Date(scan.createdAt).toLocaleString() : null
                )}
                {renderField(
                  'Completed',
                  scan.completedAt ? new Date(scan.completedAt).toLocaleString() : null
                )}
              </div>
              {scan.error ? (
                <div className='mt-3 rounded border border-rose-300 bg-rose-50 p-2 text-sm text-rose-800'>
                  {scan.error}
                </div>
              ) : null}
            </section>

            {company ? (
              <section>
                <h3 className='mb-2 text-sm font-semibold text-slate-700'>Company</h3>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {renderField('Name', company['name'])}
                  {renderField('NIP', company['nip'])}
                  {renderField('Domain', company['domain'])}
                  {renderField('Industry', company['industry'])}
                  {renderField('Size', company['size'])}
                  {renderField('City', company['city'])}
                  {renderField('Postal code', company['postalCode'])}
                  {renderField('Country', company['country'])}
                </div>
                {company['addressLine'] ? (
                  <div className='mt-2'>{renderField('Address', company['addressLine'])}</div>
                ) : null}
                {company['description'] ? (
                  <p className='mt-2 whitespace-pre-wrap text-sm text-slate-700'>
                    {String(company['description'])}
                  </p>
                ) : null}
                <div className='mt-3'>
                  <div className='mb-1 flex items-center justify-between'>
                    <h4 className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Emails
                      {company.emailsSearchedAt
                        ? ` · searched ${new Date(company.emailsSearchedAt).toLocaleString()}`
                        : ''}
                    </h4>
                    <div className='flex flex-wrap items-center gap-2'>
                      <label className='flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600'>
                        <input
                          type='checkbox'
                          checked={refreshEmailHeadless}
                          onChange={(event) => setRefreshEmailHeadless(event.target.checked)}
                          disabled={isRefreshingEmails}
                        />
                        Headless browser
                      </label>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => void runEmailRefresh({ useVision: false })}
                        disabled={isRefreshingEmails}
                      >
                        {isRefreshingEmails
                          ? 'Running scraper…'
                          : `Run browser scraper (${refreshEmailHeadless ? 'headless' : 'headed'})`}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => void runEmailRefresh({ useVision: true })}
                        disabled={isRefreshingEmails}
                      >
                        {isRefreshingEmails
                          ? 'Running scraper…'
                          : `Run vision finder (${refreshEmailHeadless ? 'headless' : 'headed'})`}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => setPromoteOpen(true)}
                      >
                        Promote to Organiser…
                      </Button>
                    </div>
                  </div>
                  {refreshEmailError ? (
                    <p className='mb-2 text-sm text-rose-800'>{refreshEmailError}</p>
                  ) : null}
                  {refreshEmailSteps.length > 0 ? (
                    <ul className='mb-2 space-y-2 text-xs text-slate-600'>
                      {refreshEmailSteps.map((step) => (
                        <li
                          key={`${step.key}-${step.startedAt}-${step.message ?? ''}`}
                          className='flex items-start gap-2 rounded border border-slate-200 p-2'
                        >
                          <span
                            className={`mt-0.5 inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${stepStatusColor(
                              step.status
                            )}`}
                          >
                            {step.status}
                          </span>
                          <div className='min-w-0 flex-1'>
                            <div className='font-medium text-slate-700'>{step.label}</div>
                            <div>{step.message || 'No details'}</div>
                            <div className='mt-1 text-[10px] text-slate-500'>
                              {step.durationMs != null ? `${step.durationMs} ms` : ''}
                              {step.completedAt
                                ? ` · ${new Date(step.completedAt).toLocaleTimeString()}`
                                : ''}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {company.emails.length === 0 ? (
                    <p className='text-sm text-slate-500'>
                      No emails found for this company yet.
                    </p>
                  ) : (
                    <ul className='space-y-1 text-sm'>
                      {company.emails.map((email) => (
                        <li key={email.address} className='flex items-baseline gap-2'>
                          <a
                            href={`mailto:${email.address}`}
                            className='text-blue-600 hover:underline'
                          >
                            {email.address}
                          </a>
                          {email.isPrimary ? (
                            <span className='inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800'>
                              primary
                            </span>
                          ) : null}
                          {email.source ? (
                            <a
                              href={email.source}
                              target='_blank'
                              rel='noreferrer'
                              className='truncate text-xs text-slate-500 hover:underline'
                            >
                              {email.source}
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ) : null}

            {listing ? (
              <section>
                <h3 className='mb-2 text-sm font-semibold text-slate-700'>Listing</h3>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {renderField('Contract', listing['contractType'])}
                  {renderField('Mode', listing['workMode'])}
                  {renderField('Level', listing['experienceLevel'])}
                  {renderField('City', listing['city'])}
                  {renderField('Region', listing['region'])}
                  {renderField('Country', listing['country'])}
                  {renderField('Posted', listing['postedAt'])}
                  {renderField('Expires', listing['expiresAt'])}
                </div>
                {salary ? (
                  <div className='mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    {renderField('Salary min', salary['min'])}
                    {renderField('Salary max', salary['max'])}
                    {renderField('Currency', salary['currency'])}
                    {renderField('Period', salary['period'])}
                    {renderField('Raw', salary['raw'])}
                  </div>
                ) : null}
                {listing['description'] ? (
                  <details className='mt-3 rounded border border-slate-200 p-2 text-sm'>
                    <summary className='cursor-pointer font-medium'>Description</summary>
                    <p className='mt-2 whitespace-pre-wrap text-slate-700'>
                      {String(listing['description'])}
                    </p>
                  </details>
                ) : null}
                <div className='mt-3 grid gap-4 sm:grid-cols-2'>
                  <div>
                    <h4 className='mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Requirements
                    </h4>
                    {renderStringList(listing['requirements'], 'No requirements extracted.')}
                  </div>
                  <div>
                    <h4 className='mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Responsibilities
                    </h4>
                    {renderStringList(
                      listing['responsibilities'],
                      'No responsibilities extracted.'
                    )}
                  </div>
                  <div>
                    <h4 className='mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Benefits
                    </h4>
                    {renderStringList(listing['benefits'], 'No benefits extracted.')}
                  </div>
                  <div>
                    <h4 className='mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Technologies
                    </h4>
                    {renderStringList(listing['technologies'], 'No technologies extracted.')}
                  </div>
                </div>
              </section>
            ) : null}

            {scan.steps.length > 0 ? (
              <section>
                <h3 className='mb-2 text-sm font-semibold text-slate-700'>Steps</h3>
                <ol className='space-y-2'>
                  {scan.steps.map((step) => (
                    <li
                      key={step.key}
                      className='flex items-start gap-3 rounded border border-slate-200 p-2 text-sm'
                    >
                      <span
                        className={`mt-0.5 inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium ${stepStatusColor(
                          step.status
                        )}`}
                      >
                        {step.status}
                      </span>
                      <div className='flex-1'>
                        <div className='font-medium'>{step.label}</div>
                        {step.message ? (
                          <div className='text-slate-600'>{step.message}</div>
                        ) : null}
                        <div className='mt-1 text-xs text-slate-500'>
                          {step.durationMs != null ? `${step.durationMs} ms` : ''}
                          {step.completedAt
                            ? ` · ${new Date(step.completedAt).toLocaleTimeString()}`
                            : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <details className='rounded border border-slate-200 p-2 text-sm'>
              <summary className='cursor-pointer font-medium text-slate-600'>
                Raw evaluation JSON
              </summary>
              <pre className='mt-2 max-h-96 overflow-auto rounded bg-slate-50 p-2 text-xs'>
                {JSON.stringify(scan.evaluation, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </DialogContent>
      <PromoteToOrganiserDialog
        company={company}
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        {...(onPromoted ? { onPromoted } : {})}
      />
    </Dialog>
  );
}
