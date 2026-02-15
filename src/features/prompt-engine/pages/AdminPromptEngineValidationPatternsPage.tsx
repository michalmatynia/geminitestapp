'use client';

import React from 'react';

import { LearnedRuleList } from '../components/LearnedRuleList';
import { PromptEngineFilters } from '../components/PromptEngineFilters';
import { PromptEngineToolbar } from '../components/PromptEngineToolbar';
import { RuleList } from '../components/RuleList';
import {
  PromptEngineProvider,
  usePromptEngine,
  type ExploderPatternSubTab,
  type PatternCollectionTab,
} from '../context/PromptEngineContext';
import {
  PromptEngineValidationPageProvider,
} from '../context/PromptEngineValidationPageContext';

type AdminPromptEngineValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
  initialPatternTab?: PatternCollectionTab;
  initialExploderSubTab?: ExploderPatternSubTab;
  lockedPatternTab?: PatternCollectionTab;
  lockedExploderSubTab?: ExploderPatternSubTab;
};

function AdminPromptEngineValidationPatternsContent(): React.JSX.Element {
  const { promptEngineSettings, saveError, isUsingDefaults } = usePromptEngine();

  return (
    <div className='space-y-4'>
      <PromptEngineToolbar />

      <div className='rounded-lg border border-border/60 bg-card/30 p-4'>
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
            Source: {isUsingDefaults ? 'defaults' : 'saved settings'}
          </div>
        </div>
      </div>

      {saveError ? (
        <div className='rounded-lg border border-red-500/40 bg-red-500/10 p-4'>
          <div className='text-xs text-red-200'>{saveError}</div>
        </div>
      ) : null}

      <PromptEngineFilters />

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
        <RuleList />
        <LearnedRuleList />
      </div>
    </div>
  );
}

function AdminPromptEngineValidationPatternsProviders(): React.JSX.Element {
  return (
    <PromptEngineProvider>
      <AdminPromptEngineValidationPatternsContent />
    </PromptEngineProvider>
  );
}

export function AdminPromptEngineValidationPatternsPage({
  embedded,
  onSaved,
  eyebrow,
  backLinkHref,
  backLinkLabel,
  initialPatternTab,
  initialExploderSubTab,
  lockedPatternTab,
  lockedExploderSubTab,
}: AdminPromptEngineValidationPatternsPageProps): React.JSX.Element {
  const pageContextValue = React.useMemo(
    () => ({
      ...(embedded !== undefined && { embedded }),
      ...(onSaved !== undefined && { onSaved }),
      ...(eyebrow !== undefined && { eyebrow }),
      ...(backLinkHref !== undefined && { backLinkHref }),
      ...(backLinkLabel !== undefined && { backLinkLabel }),
      ...(initialPatternTab !== undefined && { initialPatternTab }),
      ...(initialExploderSubTab !== undefined && { initialExploderSubTab }),
      ...(lockedPatternTab !== undefined && { lockedPatternTab }),
      ...(lockedExploderSubTab !== undefined && { lockedExploderSubTab }),
    }),
    [
      backLinkHref,
      backLinkLabel,
      embedded,
      eyebrow,
      initialExploderSubTab,
      initialPatternTab,
      lockedExploderSubTab,
      lockedPatternTab,
      onSaved,
    ]
  );

  return (
    <PromptEngineValidationPageProvider value={pageContextValue}>
      <AdminPromptEngineValidationPatternsProviders />
    </PromptEngineValidationPageProvider>
  );
}
