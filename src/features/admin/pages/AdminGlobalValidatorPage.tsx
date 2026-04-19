'use client';

import { useRouter } from 'nextjs-toploader/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { startTransition, useMemo } from 'react';

import { AdminPromptEngineValidationPatternsPage } from '@/features/admin/components/AdminPromptEngineValidationPatternsPage';
import {
  ValidatorDocsTooltipsProvider,
  ValidatorSettings,
} from '@/features/admin/components/AdminValidatorSettings';
import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  type ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { formatAdminAiEyebrow } from '@/shared/ui/admin.public';

import { GlobalValidatorPanelLayout } from './admin-global-validator-layout';

type GlobalValidatorView = 'patterns' | 'tooltips';
type ValidatorPatternListItem = ReturnType<typeof parseValidatorPatternLists>[number];

const toGlobalValidatorView = (value: string | null): GlobalValidatorView =>
  value === 'tooltips' ? 'tooltips' : 'patterns';

function pushValidatorRoute(pathname: string, queryString: string, router: ReturnType<typeof useRouter>): void {
  const nextHref = queryString !== '' ? `${pathname}?${queryString}` : pathname;
  startTransition(() => {
    router.push(nextHref, { scroll: false });
  });
}

function createPromptEnginePanel(
  props: React.ComponentProps<typeof AdminPromptEngineValidationPatternsPage>
): React.JSX.Element {
  return <AdminPromptEngineValidationPatternsPage embedded {...props} />;
}

function renderScopePanel(scope: ValidatorScope): React.JSX.Element {
  switch (scope) {
    case 'products':
      return <ValidatorSettings />;
    case 'image-studio':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Image Studio'),
        backLinkHref: '/admin/image-studio',
        backLinkLabel: 'Back to Studio',
      });
    case 'prompt-exploder':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Image Studio Prompt Exploder'),
        initialPatternTab: 'prompt_exploder',
        initialExploderSubTab: 'prompt_exploder_rules',
        lockedPatternTab: 'prompt_exploder',
        lockedExploderSubTab: 'prompt_exploder_rules',
      });
    case 'case-resolver-plain-text':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Case Resolver Plain Text'),
        initialPatternTab: 'core',
        lockedPatternTab: 'core',
        initialScope: 'case_resolver_plain_text',
        lockedScope: 'case_resolver_plain_text',
      });
    case 'ai-paths':
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('AI Paths'),
        initialPatternTab: 'core',
        lockedPatternTab: 'core',
        initialScope: 'ai_paths',
        lockedScope: 'ai_paths',
      });
    default:
      return createPromptEnginePanel({
        eyebrow: formatAdminAiEyebrow('Case Resolver Prompt Exploder'),
        initialPatternTab: 'prompt_exploder',
        initialExploderSubTab: 'case_resolver_rules',
        lockedPatternTab: 'prompt_exploder',
        lockedExploderSubTab: 'case_resolver_rules',
      });
  }
}

function resolveActiveList(
  patternLists: ValidatorPatternListItem[],
  searchParams: ReturnType<typeof useSearchParams>
): ValidatorPatternListItem | null {
  const listParam = searchParams.get('list');
  if (listParam !== null && listParam !== '') {
    const matchedById = patternLists.find((list) => list.id === listParam);
    if (matchedById !== undefined) {
      return matchedById;
    }
  }

  return patternLists[0] ?? null;
}

function getActiveDescription(activeList: ValidatorPatternListItem | null): string {
  if (activeList === null) {
    return '';
  }

  const customDescription = activeList.description.trim();
  if (customDescription === '') {
    return '';
  }

  return customDescription === VALIDATOR_SCOPE_DESCRIPTIONS[activeList.scope]
    ? ''
    : customDescription;
}

function AdminGlobalValidatorContent(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = toGlobalValidatorView(searchParams.get('view'));
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = useMemo(() => parseValidatorPatternLists(rawPatternLists), [rawPatternLists]);
  const activeList = useMemo(
    () => resolveActiveList(patternLists, searchParams),
    [patternLists, searchParams]
  );
  const activeDescription = getActiveDescription(activeList);
  const currentBreadcrumbLabel =
    activeView === 'tooltips' ? 'Settings' : activeList?.name ?? 'Validation Pattern Lists';
  const scopePanel = activeList ? renderScopePanel(activeList.scope) : null;

  const handleSelectList = (listId: string): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('list', listId);
    pushValidatorRoute(pathname, nextParams.toString(), router);
  };

  const handleSelectView = (view: GlobalValidatorView): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (view === 'patterns') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', view);
    }
    pushValidatorRoute(pathname, nextParams.toString(), router);
  };

  return (
    <GlobalValidatorPanelLayout
      activeDescription={activeDescription}
      activeListId={activeList?.id ?? null}
      activeListScope={activeList?.scope ?? null}
      activeView={activeView}
      currentBreadcrumbLabel={currentBreadcrumbLabel}
      handleSelectList={handleSelectList}
      handleSelectView={handleSelectView}
      patternLists={patternLists}
      scopePanel={scopePanel}
    />
  );
}

export function AdminGlobalValidatorPage(): React.JSX.Element {
  return (
    <ValidatorDocsTooltipsProvider>
      <AdminGlobalValidatorContent />
    </ValidatorDocsTooltipsProvider>
  );
}

export default AdminGlobalValidatorPage;
