import type { ImportValidationPatternsResult } from '@/features/products/api/settings';

import type { ValidatorPatternImportRuntimeValue } from './ValidatorPatternImportModal';

function ParseErrorPanel({ parseError }: { parseError: string | null }): React.JSX.Element | null {
  if (parseError === null) return null;

  return (
    <div className='rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200'>
      JSON parse error: {parseError}
    </div>
  );
}

function SummaryBadges({ result }: { result: ImportValidationPatternsResult }): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span className='rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200'>Scope: {result.scope}</span>
      <span className='rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-200'>Mode: {result.mode}</span>
      <span className='rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200'>Create: {result.summary.createCount}</span>
      <span className='rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200'>Update: {result.summary.updateCount}</span>
      <span className='rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200'>Delete: {result.summary.deleteCount}</span>
      <span className='rounded border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-slate-200'>Skip: {result.summary.skipCount}</span>
    </div>
  );
}

function ErrorPrefix({ code }: { code: string | null | undefined }): React.JSX.Element | null {
  if (code === null || code === undefined || code === '') return null;
  return <>{`[${code}] `}</>;
}

function ImportIssues({ result }: { result: ImportValidationPatternsResult }): React.JSX.Element {
  if (result.errors.length === 0) {
    return <p className='text-xs text-emerald-200'>No import issues detected.</p>;
  }

  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold text-red-200'>Import issues ({result.errors.length})</p>
      <div className='max-h-36 space-y-1 overflow-y-auto rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-100'>
        {result.errors.map((error, index) => (
          <p key={`${error.code ?? 'error'}-${index}`}>
            <ErrorPrefix code={error.code} />
            {error.message}
          </p>
        ))}
      </div>
    </div>
  );
}

const operationReasonSuffix = (reason: string | null | undefined): string =>
  reason === null || reason === undefined || reason === '' ? '' : ` | ${reason}`;

const semanticSummarySuffix = (summary: string | null | undefined): string =>
  summary === null || summary === undefined || summary === '' ? '' : ` | Semantic: ${summary}`;

function PlannedOperations({ result }: { result: ImportValidationPatternsResult }): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold text-slate-200'>Planned operations ({result.operations.length})</p>
      <div className='max-h-52 space-y-1 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 text-xs text-slate-200'>
        {result.operations.map((operation, index) => (
          <p key={`${operation.patternId ?? operation.code ?? operation.label}-${index}`}>
            <span className='font-semibold uppercase'>{operation.action}</span> |{' '}
            {operation.code ?? operation.patternId ?? 'n/a'} | {operation.label}
            {operationReasonSuffix(operation.reason)}
            {semanticSummarySuffix(operation.semanticAudit?.summary)}
          </p>
        ))}
      </div>
    </div>
  );
}

function ImportResultPanel({
  result,
}: {
  result: ImportValidationPatternsResult | null;
}): React.JSX.Element | null {
  if (result === null) return null;

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-background/20 p-3'>
      <SummaryBadges result={result} />
      <ImportIssues result={result} />
      <PlannedOperations result={result} />
    </div>
  );
}

export function ValidatorPatternImportContent({
  runtime,
}: {
  runtime: ValidatorPatternImportRuntimeValue;
}): React.JSX.Element {
  return (
    <>
      <ParseErrorPanel parseError={runtime.parseError} />
      <ImportResultPanel result={runtime.lastResult} />
    </>
  );
}
