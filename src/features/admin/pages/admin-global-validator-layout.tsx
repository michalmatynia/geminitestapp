'use client';

import Link from 'next/link';

import { ValidatorDocsTooltipsPanel } from '@/features/admin/components/AdminValidatorSettings';
import { VALIDATOR_SCOPE_LABELS, type ValidatorScope } from '@/features/admin/pages/validator-scope';
import { AdminSectionBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, ClientOnly } from '@/shared/ui/primitives.public';

type GlobalValidatorView = 'patterns' | 'tooltips';

type ValidatorListTab = {
  id: string;
  name: string;
  scope: ValidatorScope;
};

const LIST_TABS_ID_PREFIX = 'global-validator-lists';
const VIEW_TABS_ID_PREFIX = 'global-validator-view';

const GLOBAL_VALIDATOR_VIEW_LABELS: Record<GlobalValidatorView, string> = {
  patterns: 'Patterns',
  tooltips: 'Settings',
};

const getListTriggerId = (listId: string): string => `${LIST_TABS_ID_PREFIX}-trigger-${listId}`;
const getListContentId = (listId: string): string => `${LIST_TABS_ID_PREFIX}-content-${listId}`;
const getViewTriggerId = (view: GlobalValidatorView): string =>
  `${VIEW_TABS_ID_PREFIX}-trigger-${view}`;
const getViewContentId = (view: GlobalValidatorView): string =>
  `${VIEW_TABS_ID_PREFIX}-content-${view}`;

function GlobalValidatorViewTabs({
  activeView,
  handleSelectView,
}: {
  activeView: GlobalValidatorView;
  handleSelectView: (view: GlobalValidatorView) => void;
}): React.JSX.Element {
  return (
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
  );
}

function GlobalValidatorListTabs({
  activeListId,
  handleSelectList,
  patternLists,
}: {
  activeListId: string | null;
  handleSelectList: (listId: string) => void;
  patternLists: ValidatorListTab[];
}): React.JSX.Element | null {
  if (patternLists.length === 0) {
    return null;
  }

  return (
    <div
      role='tablist'
      aria-label='Validation pattern lists'
      className='grid h-auto w-full grid-cols-1 gap-2 border border-border/60 bg-card/30 p-2 md:grid-cols-2 xl:grid-cols-3'
    >
      {patternLists.map((list) => {
        const isActive = activeListId === list.id;
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
  );
}

function GlobalValidatorPanelContent({
  activeListId,
  activeView,
  scopePanel,
}: {
  activeListId: string | null;
  activeView: GlobalValidatorView;
  scopePanel: React.ReactNode | null;
}): React.JSX.Element {
  if (activeView === 'tooltips') {
    return (
      <section
        role='tabpanel'
        id={getViewContentId('tooltips')}
        aria-labelledby={getViewTriggerId('tooltips')}
        className='space-y-4'
      >
        <ValidatorDocsTooltipsPanel />
      </section>
    );
  }

  if (activeListId === null || scopePanel === null) {
    return (
      <FormSection variant='subtle' className='p-4'>
        <p className='text-sm text-gray-400'>
          No validation pattern lists available. Create one in Manage Lists.
        </p>
      </FormSection>
    );
  }

  return (
    <section
      role='tabpanel'
      id={getViewContentId('patterns')}
      aria-labelledby={getViewTriggerId('patterns')}
      className='space-y-4'
    >
      <section
        role='tabpanel'
        id={getListContentId(activeListId)}
        aria-labelledby={getListTriggerId(activeListId)}
        className='space-y-4'
      >
        {scopePanel}
      </section>
    </section>
  );
}

export function GlobalValidatorPanelLayout({
  activeDescription,
  activeListId,
  activeListScope,
  activeView,
  currentBreadcrumbLabel,
  handleSelectList,
  handleSelectView,
  patternLists,
  scopePanel,
}: {
  activeDescription: string;
  activeListId: string | null;
  activeListScope: ValidatorScope | null;
  activeView: GlobalValidatorView;
  currentBreadcrumbLabel: string;
  handleSelectList: (listId: string) => void;
  handleSelectView: (view: GlobalValidatorView) => void;
  patternLists: ValidatorListTab[];
  scopePanel: React.ReactNode | null;
}): React.JSX.Element {
  return (
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
                {activeListScope !== null ? (
                  <Badge variant='processing'>{VALIDATOR_SCOPE_LABELS[activeListScope]}</Badge>
                ) : null}
                <Badge variant='outline' className='border-white/10 text-gray-300'>
                  {patternLists.length} lists
                </Badge>
              </>
            }
          />
        }
        filters={<GlobalValidatorViewTabs activeView={activeView} handleSelectView={handleSelectView} />}
        actions={
          activeView === 'patterns' ? (
            <GlobalValidatorListTabs
              activeListId={activeListId}
              handleSelectList={handleSelectList}
              patternLists={patternLists}
            />
          ) : null
        }
        alerts={
          activeView === 'patterns' && activeDescription !== '' ? (
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
          <GlobalValidatorPanelContent
            activeListId={activeListId}
            activeView={activeView}
            scopePanel={scopePanel}
          />
        </ClientOnly>
      </ListPanel>
    </div>
  );
}
