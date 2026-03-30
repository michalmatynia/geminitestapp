/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageBuilderPolicyProvider } from '@/features/cms/components/page-builder/PageBuilderPolicyContext';
import {
  PageBuilderProvider,
  usePageBuilder,
} from '@/features/cms/hooks/usePageBuilderContext';
import { DEFAULT_INSPECTOR_SETTINGS, type PageBuilderState } from '@/shared/contracts/cms';

const collectBlockTypes = (state: PageBuilderState): string[] => {
  const blockTypes: string[] = [];
  const visit = (blocks: Array<{ type: string; blocks?: Array<{ type: string; blocks?: unknown[] }> }>): void => {
    for (const block of blocks) {
      blockTypes.push(block.type);
      if (block.blocks) {
        visit(block.blocks);
      }
    }
  };

  for (const section of state.sections) {
    visit(section.blocks);
  }

  return blockTypes;
};

function PolicyStateConsumer(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();

  return (
    <div>
      <div data-testid='section-types'>{state.sections.map((section) => section.type).join(',')}</div>
      <div data-testid='block-types'>{collectBlockTypes(state).join(',')}</div>
      <div data-testid='clipboard'>{state.clipboard ? state.clipboard.type : 'empty'}</div>
      <button type='button' onClick={() => dispatch({ type: 'PASTE_BLOCK', sectionId: 'section-1' })}>
        Paste block
      </button>
      <button
        type='button'
        onClick={() => dispatch({ type: 'ADD_SECTION', sectionType: 'Model3DElement', zone: 'template' })}
      >
        Add section
      </button>
    </div>
  );
}

const initialState: PageBuilderState = {
  pages: [],
  currentPage: null,
  sections: [
    {
      id: 'section-1',
      type: 'Block',
      zone: 'template',
      parentSectionId: null,
      settings: {},
      blocks: [
        {
          id: 'block-heading',
          type: 'Heading',
          settings: { headingText: 'Hello' },
        },
      ],
    },
  ],
  selectedNodeId: 'section-1',
  inspectorEnabled: false,
  inspectorSettings: DEFAULT_INSPECTOR_SETTINGS,
  previewMode: 'desktop',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  clipboard: {
    type: 'block',
    data: {
      id: 'clipboard-model-3d',
      type: 'Model3D',
      settings: { assetId: 'asset-123' },
    },
  },
  history: { past: [], future: [] },
};

describe('PageBuilderProvider policy sanitization', () => {
  it('prevents hidden 3D blocks and sections from entering state through non-picker actions', () => {
    render(
      <PageBuilderPolicyProvider
        value={{ hiddenBlockTypes: ['Model3D', 'Model3DElement'], hiddenSectionTypes: ['Model3DElement'] }}
      >
        <PageBuilderProvider initialState={initialState}>
          <PolicyStateConsumer />
        </PageBuilderProvider>
      </PageBuilderPolicyProvider>
    );

    expect(screen.getByTestId('block-types')).toHaveTextContent('Heading');
    expect(screen.getByTestId('clipboard')).toHaveTextContent('empty');

    fireEvent.click(screen.getByRole('button', { name: 'Paste block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));

    expect(screen.getByTestId('block-types')).toHaveTextContent('Heading');
    expect(screen.getByTestId('block-types')).not.toHaveTextContent('Model3D');
    expect(screen.getByTestId('section-types')).toHaveTextContent('Block');
    expect(screen.getByTestId('section-types')).not.toHaveTextContent('Model3DElement');
  });
});
