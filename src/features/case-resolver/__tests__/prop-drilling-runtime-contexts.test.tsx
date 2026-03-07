import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCaseListNodeRuntimeContext } from '@/features/case-resolver/components/list/sections/CaseListNodeRuntimeContext';
import { useCaseListPanelControlsContext } from '@/features/case-resolver/components/list/CaseListPanelControlsContext';
import { useCaseListSearchActionsContext } from '@/features/case-resolver/components/list/search';
import { useCaseResolverTreeNodeRuntimeContext } from '@/features/case-resolver/components/CaseResolverTreeNodeRuntimeContext';
import {
  useCaseResolverViewActionsContext,
  useCaseResolverViewStateContext,
} from '@/features/case-resolver/components/CaseResolverViewContext';
import { CaseResolverEntitySettingsModal } from '@/features/case-resolver/components/modals/CaseResolverEntitySettingsModal';
import {
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from '@/features/case-resolver/components/NodeFileWorkspaceContext';
import {
  useAdminCaseResolverPageActionsContext,
  useAdminCaseResolverPageStateContext,
} from '@/features/case-resolver/context/AdminCaseResolverPageContext';
import {
  useAdminCaseResolverCasesActionsContext,
  useAdminCaseResolverCasesStateContext,
} from '@/features/case-resolver/context/AdminCaseResolverCasesContext';
import {
  useCaseResolverFolderTreeUiActionsContext,
  useCaseResolverFolderTreeUiStateContext,
} from '@/features/case-resolver/context/CaseResolverFolderTreeContext';
import {
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '@/features/case-resolver/relation-search/context/DocumentRelationSearchContext';
import { useDocumentRelationSearchRuntime } from '@/features/case-resolver/relation-search/components/DocumentRelationSearchRuntimeContext';
import { useRelationTreeBrowserRuntime } from '@/features/case-resolver/relation-search/components/RelationTreeBrowserRuntimeContext';
import { useRelationTreeNodeRuntimeContext } from '@/features/case-resolver/relation-search/components/RelationTreeNodeRuntimeContext';
import { useDocumentRelationSearchUiContext } from '@/features/case-resolver/relation-search/components/DocumentRelationSearchUiContext';

function CaseListNodeRuntimeConsumer(): React.JSX.Element {
  useCaseListNodeRuntimeContext();
  return <div>ok</div>;
}

function CaseResolverTreeNodeRuntimeConsumer(): React.JSX.Element {
  useCaseResolverTreeNodeRuntimeContext();
  return <div>ok</div>;
}

function CaseListSearchActionsConsumer(): React.JSX.Element {
  useCaseListSearchActionsContext();
  return <div>ok</div>;
}

function CaseListPanelControlsConsumer(): React.JSX.Element {
  useCaseListPanelControlsContext();
  return <div>ok</div>;
}

function DocumentRelationSearchUiConsumer(): React.JSX.Element {
  useDocumentRelationSearchUiContext();
  return <div>ok</div>;
}

function DocumentRelationSearchRuntimeConsumer(): React.JSX.Element {
  useDocumentRelationSearchRuntime();
  return <div>ok</div>;
}

function RelationTreeNodeRuntimeConsumer(): React.JSX.Element {
  useRelationTreeNodeRuntimeContext();
  return <div>ok</div>;
}

function RelationTreeBrowserRuntimeConsumer(): React.JSX.Element {
  useRelationTreeBrowserRuntime();
  return <div>ok</div>;
}

function CaseResolverEntitySettingsModalConsumer(): React.JSX.Element {
  return <CaseResolverEntitySettingsModal />;
}

function AdminCaseResolverPageStateConsumer(): React.JSX.Element {
  useAdminCaseResolverPageStateContext();
  return <div>ok</div>;
}

function AdminCaseResolverPageActionsConsumer(): React.JSX.Element {
  useAdminCaseResolverPageActionsContext();
  return <div>ok</div>;
}

function AdminCaseResolverCasesStateConsumer(): React.JSX.Element {
  useAdminCaseResolverCasesStateContext();
  return <div>ok</div>;
}

function AdminCaseResolverCasesActionsConsumer(): React.JSX.Element {
  useAdminCaseResolverCasesActionsContext();
  return <div>ok</div>;
}

function CaseResolverFolderTreeUiStateConsumer(): React.JSX.Element {
  useCaseResolverFolderTreeUiStateContext();
  return <div>ok</div>;
}

function CaseResolverFolderTreeUiActionsConsumer(): React.JSX.Element {
  useCaseResolverFolderTreeUiActionsContext();
  return <div>ok</div>;
}

function CaseResolverViewStateConsumer(): React.JSX.Element {
  useCaseResolverViewStateContext();
  return <div>ok</div>;
}

function CaseResolverViewActionsConsumer(): React.JSX.Element {
  useCaseResolverViewActionsContext();
  return <div>ok</div>;
}

function DocumentRelationSearchStateConsumer(): React.JSX.Element {
  useDocumentRelationSearchStateContext();
  return <div>ok</div>;
}

function DocumentRelationSearchActionsConsumer(): React.JSX.Element {
  useDocumentRelationSearchActionsContext();
  return <div>ok</div>;
}

function NodeFileWorkspaceStateConsumer(): React.JSX.Element {
  useNodeFileWorkspaceStateContext();
  return <div>ok</div>;
}

function NodeFileWorkspaceActionsConsumer(): React.JSX.Element {
  useNodeFileWorkspaceActionsContext();
  return <div>ok</div>;
}

describe('prop-drilling runtime contexts', () => {
  it('throws when CaseListNodeRuntime context is missing', () => {
    expect(() => render(<CaseListNodeRuntimeConsumer />)).toThrow(
      'useCaseListNodeRuntimeContext must be used within a CaseListNodeRuntimeProvider'
    );
  });

  it('throws when CaseResolverTreeNodeRuntime context is missing', () => {
    expect(() => render(<CaseResolverTreeNodeRuntimeConsumer />)).toThrow(
      'useCaseResolverTreeNodeRuntimeContext must be used within a CaseResolverTreeNodeRuntimeProvider'
    );
  });

  it('throws when CaseListSearchActions context is missing', () => {
    expect(() => render(<CaseListSearchActionsConsumer />)).toThrow(
      'useCaseListSearchActionsContext must be used within a CaseListSearchActionsProvider'
    );
  });

  it('throws when CaseListPanelControls context is missing', () => {
    expect(() => render(<CaseListPanelControlsConsumer />)).toThrow(
      'useCaseListPanelControlsContext must be used within CaseListPanelControlsProvider'
    );
  });

  it('throws when DocumentRelationSearchUi context is missing', () => {
    expect(() => render(<DocumentRelationSearchUiConsumer />)).toThrow(
      'useDocumentRelationSearchUiContext must be used within a DocumentRelationSearchUiProvider'
    );
  });

  it('throws when DocumentRelationSearchRuntime context is missing', () => {
    expect(() => render(<DocumentRelationSearchRuntimeConsumer />)).toThrow(
      'useDocumentRelationSearchRuntime must be used within DocumentRelationSearchRuntimeProvider'
    );
  });

  it('throws when RelationTreeNodeRuntime context is missing', () => {
    expect(() => render(<RelationTreeNodeRuntimeConsumer />)).toThrow(
      'useRelationTreeNodeRuntimeContext must be used within a RelationTreeNodeRuntimeProvider'
    );
  });

  it('throws when RelationTreeBrowserRuntime context is missing', () => {
    expect(() => render(<RelationTreeBrowserRuntimeConsumer />)).toThrow(
      'useRelationTreeBrowserRuntime must be used within RelationTreeBrowserRuntimeProvider'
    );
  });

  it('throws when CaseResolverEntitySettingsModal context is missing', () => {
    expect(() => render(<CaseResolverEntitySettingsModalConsumer />)).toThrow(
      'useCaseResolverEntitySettingsModalRuntime must be used within CaseResolverEntitySettingsModalProvider'
    );
  });

  it('throws when AdminCaseResolverPage state context is missing', () => {
    expect(() => render(<AdminCaseResolverPageStateConsumer />)).toThrow(
      'useAdminCaseResolverPageStateContext must be used within AdminCaseResolverPageProvider'
    );
  });

  it('throws when AdminCaseResolverPage actions context is missing', () => {
    expect(() => render(<AdminCaseResolverPageActionsConsumer />)).toThrow(
      'useAdminCaseResolverPageActionsContext must be used within AdminCaseResolverPageProvider'
    );
  });

  it('throws when AdminCaseResolverCases state context is missing', () => {
    expect(() => render(<AdminCaseResolverCasesStateConsumer />)).toThrow(
      'useAdminCaseResolverCasesStateContext must be used within AdminCaseResolverCasesProvider'
    );
  });

  it('throws when AdminCaseResolverCases actions context is missing', () => {
    expect(() => render(<AdminCaseResolverCasesActionsConsumer />)).toThrow(
      'useAdminCaseResolverCasesActionsContext must be used within AdminCaseResolverCasesProvider'
    );
  });

  it('throws when CaseResolverFolderTreeUi state context is missing', () => {
    expect(() => render(<CaseResolverFolderTreeUiStateConsumer />)).toThrow(
      'useCaseResolverFolderTreeUiStateContext must be used within CaseResolverFolderTreeProvider'
    );
  });

  it('throws when CaseResolverFolderTreeUi actions context is missing', () => {
    expect(() => render(<CaseResolverFolderTreeUiActionsConsumer />)).toThrow(
      'useCaseResolverFolderTreeUiActionsContext must be used within CaseResolverFolderTreeProvider'
    );
  });

  it('throws when CaseResolverView state context is missing', () => {
    expect(() => render(<CaseResolverViewStateConsumer />)).toThrow(
      'useCaseResolverViewStateContext must be used within CaseResolverViewProvider'
    );
  });

  it('throws when CaseResolverView actions context is missing', () => {
    expect(() => render(<CaseResolverViewActionsConsumer />)).toThrow(
      'useCaseResolverViewActionsContext must be used within CaseResolverViewProvider'
    );
  });

  it('throws when DocumentRelationSearch state context is missing', () => {
    expect(() => render(<DocumentRelationSearchStateConsumer />)).toThrow(
      'useDocumentRelationSearchStateContext must be used within a DocumentRelationSearchProvider'
    );
  });

  it('throws when DocumentRelationSearch actions context is missing', () => {
    expect(() => render(<DocumentRelationSearchActionsConsumer />)).toThrow(
      'useDocumentRelationSearchActionsContext must be used within a DocumentRelationSearchProvider'
    );
  });

  it('throws when NodeFileWorkspace state context is missing', () => {
    expect(() => render(<NodeFileWorkspaceStateConsumer />)).toThrow(
      'useNodeFileWorkspaceStateContext must be used within NodeFileWorkspaceProvider'
    );
  });

  it('throws when NodeFileWorkspace actions context is missing', () => {
    expect(() => render(<NodeFileWorkspaceActionsConsumer />)).toThrow(
      'useNodeFileWorkspaceActionsContext must be used within NodeFileWorkspaceProvider'
    );
  });
});
