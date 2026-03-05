import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCaseListNodeRuntimeContext } from '@/features/case-resolver/components/list/sections/CaseListNodeRuntimeContext';
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
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '@/features/case-resolver/relation-search/context/DocumentRelationSearchContext';
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

function DocumentRelationSearchUiConsumer(): React.JSX.Element {
  useDocumentRelationSearchUiContext();
  return <div>ok</div>;
}

function RelationTreeNodeRuntimeConsumer(): React.JSX.Element {
  useRelationTreeNodeRuntimeContext();
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

  it('throws when DocumentRelationSearchUi context is missing', () => {
    expect(() => render(<DocumentRelationSearchUiConsumer />)).toThrow(
      'useDocumentRelationSearchUiContext must be used within a DocumentRelationSearchUiProvider'
    );
  });

  it('throws when RelationTreeNodeRuntime context is missing', () => {
    expect(() => render(<RelationTreeNodeRuntimeConsumer />)).toThrow(
      'useRelationTreeNodeRuntimeContext must be used within a RelationTreeNodeRuntimeProvider'
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
