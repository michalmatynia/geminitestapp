'use client';

import { Button, DocumentationSection, useToast } from '@/shared/ui';

import { VALIDATOR_FUNCTION_DOCS, VALIDATOR_UI_DOCS } from './validator-docs-catalog';
import { buildFullValidatorDocumentationClipboardText } from './validator-documentation-clipboard';

export function ValidatorDocumentationTab(): React.JSX.Element {
  const { toast } = useToast();

  const handleCopyFullDocumentation = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast('Clipboard API is not available in this browser.', { variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildFullValidatorDocumentationClipboardText());
      toast('Full validator documentation copied (including JSON snippets).', {
        variant: 'success',
      });
    } catch {
      toast('Failed to copy full validator documentation.', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-black/20 p-3'>
        <p className='text-xs text-gray-400'>
          Copy all validator docs sections and JSON snippets in one click.
        </p>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            void handleCopyFullDocumentation();
          }}
          className='border-sky-500/40 text-sky-200 hover:bg-sky-500/10'
          title='Copy all validation docs sections including JSON snippets'
        >
          Copy Full Validation Docs
        </Button>
      </div>

      <DocumentationSection title='Validation Pattern Tool Documentation'>
        <p className='text-sm leading-relaxed text-gray-300'>
          This tab exposes the complete validator documentation that powers inline tooltips and
          function reference content. It is sourced from a single catalog used by UI and docs
          generation scripts.
        </p>
      </DocumentationSection>

      <DocumentationSection title='Function Reference'>
        <div className='space-y-3'>
          {VALIDATOR_FUNCTION_DOCS.map((doc) => (
            <div key={doc.id} className='rounded border border-border/60 bg-black/20 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='font-mono text-xs text-cyan-200'>{doc.id}</p>
                <p className='font-mono text-[11px] text-gray-500'>{doc.file}</p>
              </div>
              <p className='mt-1 text-sm text-gray-200'>
                <span className='font-semibold text-white'>{doc.symbol}</span>: {doc.purpose}
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                <span className='font-semibold text-gray-300'>Params:</span> {doc.params.join(' ')}
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                <span className='font-semibold text-gray-300'>Returns:</span> {doc.returns}
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                <span className='font-semibold text-gray-300'>Errors:</span> {doc.errors.join(' ')}
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                <span className='font-semibold text-gray-300'>Edge cases:</span>{' '}
                {doc.edgeCases.join(' ')}
              </p>
              <p className='mt-1 font-mono text-[11px] text-emerald-200'>Example: {doc.example}</p>
            </div>
          ))}
        </div>
      </DocumentationSection>

      <DocumentationSection title='UI Controls & Tooltips'>
        <div className='space-y-3'>
          {VALIDATOR_UI_DOCS.map((doc) => (
            <div key={doc.id} className='rounded border border-border/60 bg-black/20 p-3'>
              <p className='font-mono text-xs text-fuchsia-200'>{doc.id}</p>
              <p className='mt-1 text-sm text-gray-200'>
                <span className='font-semibold text-white'>{doc.title}</span>: {doc.description}
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                <span className='font-semibold text-gray-300'>Related functions:</span>{' '}
                {doc.relatedFunctions.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </DocumentationSection>
    </div>
  );
}
