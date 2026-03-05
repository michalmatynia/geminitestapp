'use client';

import React from 'react';

import { Alert, StatusBadge, MetadataItem, Card } from '@/shared/ui';

import { LearnedRuleList } from '../components/LearnedRuleList';
import { PromptEngineFilters } from '../components/PromptEngineFilters';
import { PromptEngineToolbar } from '../components/PromptEngineToolbar';
import { RuleList } from '../components/RuleList';
import { PromptEngineProvider } from '../context/PromptEngineContext';
import {
  type ExploderPatternSubTab,
  type PatternCollectionTab,
  usePromptEngineConfig,
} from '../context/prompt-engine/PromptEngineConfigContext';
import { usePromptEngineData } from '../context/prompt-engine/PromptEngineDataContext';
import { PromptEngineValidationPageProvider } from '../context/PromptEngineValidationPageContext';
import type { PromptValidationScope } from '@/shared/lib/prompt-engine/settings';

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
  initialScope?: PromptValidationScope | 'all';
  lockedScope?: PromptValidationScope | 'all';
};

function AdminPromptEngineValidationPatternsContent(): React.JSX.Element {
  const { promptEngineSettings, isUsingDefaults } = usePromptEngineConfig();
  const { saveError } = usePromptEngineData();

  return (
    <div className='space-y-4'>
      <PromptEngineToolbar />

      <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <StatusBadge
            status={
              promptEngineSettings.promptValidation.enabled
                ? 'Validator enabled'
                : 'Validator disabled'
            }
            variant={promptEngineSettings.promptValidation.enabled ? 'success' : 'warning'}
          />
          <MetadataItem
            label='Source'
            value={isUsingDefaults ? 'defaults' : 'saved settings'}
            variant='subtle'
          />
        </div>
      </Card>

      {saveError ? <Alert variant='error'>{saveError}</Alert> : null}

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
  initialScope,
  lockedScope,
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
      ...(initialScope !== undefined && { initialScope }),
      ...(lockedScope !== undefined && { lockedScope }),
    }),
    [
      backLinkHref,
      backLinkLabel,
      embedded,
      eyebrow,
      initialExploderSubTab,
      initialPatternTab,
      initialScope,
      lockedExploderSubTab,
      lockedPatternTab,
      lockedScope,
      onSaved,
    ]
  );

  return (
    <PromptEngineValidationPageProvider value={pageContextValue}>
      <AdminPromptEngineValidationPatternsProviders />
    </PromptEngineValidationPageProvider>
  );
}
