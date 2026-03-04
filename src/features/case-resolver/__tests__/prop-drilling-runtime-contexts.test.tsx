import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCaseListNodeRuntimeContext } from '@/features/case-resolver/components/list/sections/CaseListNodeRuntimeContext';
import { useCaseListSearchActionsContext } from '@/features/case-resolver/components/list/search';
import { useCaseResolverTreeNodeRuntimeContext } from '@/features/case-resolver/components/CaseResolverTreeNodeRuntimeContext';
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
});
