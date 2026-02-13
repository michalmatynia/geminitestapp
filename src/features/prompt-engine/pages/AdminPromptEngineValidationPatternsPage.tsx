'use client';

import React from 'react';

import { SectionPanel } from '@/shared/ui';

import { LearnedRuleList } from '../components/LearnedRuleList';
import { PromptEngineFilters } from '../components/PromptEngineFilters';
import { PromptEngineToolbar } from '../components/PromptEngineToolbar';
import { RuleList } from '../components/RuleList';
import { PromptEngineProvider, usePromptEngine } from '../context/PromptEngineContext';
import { PromptEnginePageChromeProvider } from '../context/PromptEnginePageChromeContext';

type AdminPromptEngineValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
};

function AdminPromptEngineValidationPatternsContent({
  embedded,
  eyebrow,
  backLinkHref,
  backLinkLabel,
}: Omit<AdminPromptEngineValidationPatternsPageProps, 'onSaved'>): React.JSX.Element {
  const { promptEngineSettings, saveError } = usePromptEngine();
  const pageChrome = React.useMemo(() => ({
    ...(embedded !== undefined && { embedded }),
    ...(eyebrow !== undefined && { eyebrow }),
    ...(backLinkHref !== undefined && { backLinkHref }),
    ...(backLinkLabel !== undefined && { backLinkLabel }),
  }), [backLinkHref, backLinkLabel, embedded, eyebrow]);

  return (
    <PromptEnginePageChromeProvider value={pageChrome}>
      <div className='space-y-4'>
        <PromptEngineToolbar />

        <SectionPanel variant='subtle'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='text-sm text-gray-200'>
              {promptEngineSettings.promptValidation.enabled ? (
                <span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200'>
                  Validator enabled
                </span>
              ) : (
                <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200'>
                  Validator disabled
                </span>
              )}
            </div>
            <div className='text-[11px] text-gray-400'>
              Source: {usePromptEngine().isUsingDefaults ? 'defaults' : 'saved settings'}
            </div>
          </div>
        </SectionPanel>

        {saveError ? (
          <SectionPanel variant='danger'>
            <div className='text-xs text-red-200'>{saveError}</div>
          </SectionPanel>
        ) : null}

        <PromptEngineFilters />

        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <RuleList />
          <LearnedRuleList />
        </div>
      </div>
    </PromptEnginePageChromeProvider>
  );
}

export function AdminPromptEngineValidationPatternsPage(props: AdminPromptEngineValidationPatternsPageProps): React.JSX.Element {
  return (
    <PromptEngineProvider onSaved={props.onSaved}>
      <AdminPromptEngineValidationPatternsContent {...props} />
    </PromptEngineProvider>
  );
}
