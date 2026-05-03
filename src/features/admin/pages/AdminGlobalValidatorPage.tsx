'use client';

import { ValidatorDocsTooltipsProvider } from '@/features/admin/components/AdminValidatorSettings';
import { GlobalValidatorPanelLayout } from './admin-global-validator-layout';
import { useValidatorNavigation } from './validator-page/useValidatorNavigation';
import { useValidatorState } from './validator-page/useValidatorState';
import { renderScopePanel } from './validator-page/ValidatorScopeRenderer';

function AdminGlobalValidatorContent(): React.JSX.Element {
  const {
    activeView,
    patternLists,
    activeList,
    activeDescription,
    currentBreadcrumbLabel,
  } = useValidatorState();
  
  const { handleSelectList, handleSelectView } = useValidatorNavigation();

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
      scopePanel={activeList ? renderScopePanel(activeList.scope) : null}
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
