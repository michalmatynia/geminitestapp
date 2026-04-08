'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, startTransition } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
  type ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import { AdminPromptEngineValidationPatternsPage } from '@/features/admin/components/AdminPromptEngineValidationPatternsPage';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { formatAdminAiEyebrow } from '@/shared/ui/admin.public';
import {
  ValidatorDocsTooltipsPanel,
  ValidatorDocsTooltipsProvider,
  ValidatorSettings,
} from '@/features/admin/components/AdminValidatorSettings';
import { AdminSectionBreadcrumbs } from '@/shared/ui/admin.public';
import { Badge, Button, ClientOnly } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';

const LIST_TABS_ID_PREFIX = 'global-validator-lists';
const getListTriggerId = (listId: string): string => `${LIST_TABS_ID_PREFIX}-trigger-${listId}`;
const getListContentId = (listId: string): string => `${LIST_TABS_ID_PREFIX}-content-${listId}`;

type GlobalValidatorView = 'patterns' | 'tooltips';

const GLOBAL_VALIDATOR_VIEW_LABELS: Record<GlobalValidatorView, string> = {
  patterns: 'Patterns',
  tooltips: 'Settings',
};

const VIEW_TABS_ID_PREFIX = 'global-validator-view';
const getViewTriggerId = (view: GlobalValidatorView): string =>
  `${VIEW_TABS_ID_PREFIX}-trigger-${view}`;
const getViewContentId = (view: GlobalValidatorView): string =>
  `${VIEW_TABS_ID_PREFIX}-content-${view}`;

const toGlobalValidatorView = (value: string | null): GlobalValidatorView =>
  value === 'tooltips' ? 'tooltips' : 'patterns';

export function AdminGlobalValidatorPage(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = toGlobalValidatorView(searchParams.get('view'));
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );

  const activeList = useMemo(() => {
    const listParam = searchParams.get('list');
    if (listParam) {
      const matchedById = patternLists.find((list) => list.id === listParam);
      if (matchedById) return matchedById;
    }
    return patternLists[0] ?? null;
  }, [patternLists, searchParams]);

  const handleSelectList = (listId: string): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('list', listId);
    const nextQuery = nextParams.toString();
    startTransition(() => { router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false }); });
  };

  const handleSelectView = (view: GlobalValidatorView): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (view === 'patterns') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', view);
    }
    const nextQuery = nextParams.toString();
    startTransition(() => { router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false }); });
  };

  const renderScopePanel = (scope: ValidatorScope): React.JSX.Element => {
    if (scope === 'products') {
      return <ValidatorSettings />;
    }

    if (scope === 'image-studio') {
      return (
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow={formatAdminAiEyebrow('Image Studio')}
          backLinkHref='/admin/image-studio'
          backLinkLabel='Back to Studio'
        />
      );
    }

    if (scope === 'prompt-exploder') {
      return (
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow={formatAdminAiEyebrow('Image Studio Prompt Exploder')}
          initialPatternTab='prompt_exploder'
          initialExploderSubTab='prompt_exploder_rules'
          lockedPatternTab='prompt_exploder'
          lockedExploderSubTab='prompt_exploder_rules'
        />
      );
    }

    if (scope === 'case-resolver-plain-text') {
      return (
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow={formatAdminAiEyebrow('Case Resolver Plain Text')}
          initialPatternTab='core'
          lockedPatternTab='core'
          initialScope='case_resolver_plain_text'
          lockedScope='case_resolver_plain_text'
        />
      );
    }

    if (scope === 'ai-paths') {
      return (
        <AdminPromptEngineValidationPatternsPage
          embedded
          eyebrow={formatAdminAiEyebrow('AI Paths')}
          initialPatternTab='core'
          lockedPatternTab='core'
          initialScope='ai_paths'
          lockedScope='ai_paths'
        />
      );
    }

    return (
      <AdminPromptEngineValidationPatternsPage
        embedded
        eyebrow={formatAdminAiEyebrow('Case Resolver Prompt Exploder')}
        initialPatternTab='prompt_exploder'
        initialExploderSubTab='case_resolver_rules'
        lockedPatternTab='prompt_exploder'
        lockedExploderSubTab='case_resolver_rules'
      />
    );
  };

  const activeDescription = activeList
    ? (() => {
        const customDescription = activeList.description.trim();
        if (!customDescription) return '';
        return customDescription === VALIDATOR_SCOPE_DESCRIPTIONS[activeList.scope]
          ? ''
          : customDescription;
      })()
    : '';
  const currentBreadcrumbLabel =
    activeView === 'tooltips' ? 'Settings' : activeList?.name ?? 'Validation Pattern Lists';

  return (
    <ValidatorDocsTooltipsProvider>
      <div className='space-y-6'>
        <ListPanel
          variant='flat'
          className='[&>div:first-child]:mb-3'
          header={
            <AdminTitleBreadcrumbHeader
              title={
                <h1 className='text-3xl font-bold tracking-tight text-white'>Global Validator</h1>
              }
              breadcrumb={
                <AdminSectionBreadcrumbs
                  section={{ label: 'Global Validator', href: '/admin/validator' }}
                  current={currentBreadcrumbLabel}
                />
              }
              actions={
                <>
                  <Button type='button' variant='outline' size='xs' asChild>
                    <Link href='/admin/validator/lists'>Manage Lists</Link>
                  </Button>
                  {activeList ? (
                    <Badge variant='processing'>{VALIDATOR_SCOPE_LABELS[activeList.scope]}</Badge>
                  ) : null}
                  <Badge variant='outline' className='border-white/10 text-gray-300'>
                    {patternLists.length} lists
                  </Badge>
                </>
              }
            />
          }
          filters={
            <div
              role='tablist'
              aria-label='Global validator views'
              className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2 md:max-w-md'
            >
              {(['patterns', 'tooltips'] as const).map((view) => {
                const isActive = activeView === view;
                return (
                  <button
                    key={view}
                    type='button'
                    role='tab'
                    id={getViewTriggerId(view)}
                    aria-controls={getViewContentId(view)}
                    aria-selected={isActive}
                    onClick={() => handleSelectView(view)}
                    className={`inline-flex h-11 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border border-white/20 bg-white/10 text-white'
                        : 'border border-transparent text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {GLOBAL_VALIDATOR_VIEW_LABELS[view]}
                  </button>
                );
              })}
            </div>
          }
          actions={
            activeView === 'patterns' && patternLists.length > 0 ? (
              <div
                role='tablist'
                aria-label='Validation pattern lists'
                className='grid h-auto w-full grid-cols-1 gap-2 border border-border/60 bg-card/30 p-2 md:grid-cols-2 xl:grid-cols-3'
              >
                {patternLists.map((list) => {
                  const isActive = activeList?.id === list.id;
                  return (
                    <button
                      key={list.id}
                      type='button'
                      role='tab'
                      id={getListTriggerId(list.id)}
                      aria-controls={getListContentId(list.id)}
                      aria-selected={isActive}
                      onClick={() => handleSelectList(list.id)}
                      className={`inline-flex min-h-14 flex-col items-start justify-center gap-1 rounded-md px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border border-white/20 bg-white/10 text-white'
                          : 'border border-transparent text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className='text-sm font-semibold'>{list.name}</span>
                      <span className='text-[11px] uppercase tracking-[0.18em] text-gray-400'>
                        {VALIDATOR_SCOPE_LABELS[list.scope]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null
          }
          alerts={
            activeView === 'patterns' && activeDescription ? (
              <FormSection variant='subtle' className='p-4'>
                <p className='text-sm text-gray-300'>{activeDescription}</p>
              </FormSection>
            ) : null
          }
        >
          <ClientOnly
            fallback={
              <FormSection variant='subtle' className='p-4'>
                <p className='text-sm text-gray-400'>Loading validator scopes...</p>
              </FormSection>
            }
          >
            {activeView === 'tooltips' ? (
              <section
                role='tabpanel'
                id={getViewContentId('tooltips')}
                aria-labelledby={getViewTriggerId('tooltips')}
                className='space-y-4'
              >
                <ValidatorDocsTooltipsPanel />
              </section>
            ) : activeList ? (
              <section
                role='tabpanel'
                id={getViewContentId('patterns')}
                aria-labelledby={getViewTriggerId('patterns')}
                className='space-y-4'
              >
                <section
                  role='tabpanel'
                  id={getListContentId(activeList.id)}
                  aria-labelledby={getListTriggerId(activeList.id)}
                  className='space-y-4'
                >
                  {renderScopePanel(activeList.scope)}
                </section>
              </section>
            ) : (
              <FormSection variant='subtle' className='p-4'>
                <p className='text-sm text-gray-400'>
                  No validation pattern lists available. Create one in Manage Lists.
                </p>
              </FormSection>
            )}
          </ClientOnly>
        </ListPanel>
      </div>
    </ValidatorDocsTooltipsProvider>
  );
}

export default AdminGlobalValidatorPage;
