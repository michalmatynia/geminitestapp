import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCaseListNodeRuntimeContext } from '@/features/case-resolver/components/list/sections/CaseListNodeRuntimeContext';
import { useCaseResolverTreeNodeRuntimeContext } from '@/features/case-resolver/components/CaseResolverTreeNodeRuntimeContext';
import { useDocumentRelationSearchUiContext } from '@/features/case-resolver/relation-search/components/DocumentRelationSearchUiContext';

function CaseListNodeRuntimeConsumer(): React.JSX.Element {
  useCaseListNodeRuntimeContext();
  return <div>ok</div>;
}

function CaseResolverTreeNodeRuntimeConsumer(): React.JSX.Element {
  useCaseResolverTreeNodeRuntimeContext();
  return <div>ok</div>;
}

function DocumentRelationSearchUiConsumer(): React.JSX.Element {
  useDocumentRelationSearchUiContext();
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

  it('throws when DocumentRelationSearchUi context is missing', () => {
    expect(() => render(<DocumentRelationSearchUiConsumer />)).toThrow(
      'useDocumentRelationSearchUiContext must be used within a DocumentRelationSearchUiProvider'
    );
  });
});
