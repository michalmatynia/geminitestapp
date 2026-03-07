import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

const mockState = vi.hoisted(() => ({
  updateSelectedNodeConfig: vi.fn(),
}));

vi.mock('../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: {
      id: 'prompt-node',
      type: 'prompt',
      config: {
        prompt: {
          template: 'Describe the product',
        },
      },
    },
  }),
  useAiPathGraph: () => ({
    nodes: [
      {
        id: 'prompt-node',
        type: 'prompt',
        config: {
          prompt: {
            template: 'Describe the product',
          },
        },
        inputs: ['title', 'bundle'],
        outputs: ['result'],
      },
      {
        id: 'parser-node',
        type: 'parser',
        config: {
          parser: {
            mappings: {
              sku: 'sku',
            },
          },
        },
        inputs: [],
        outputs: ['bundle'],
      },
    ],
    edges: [
      { from: 'source-node', to: 'prompt-node', toPort: 'title' },
      { from: 'parser-node', to: 'prompt-node', toPort: 'bundle' },
    ],
  }),
  useAiPathRuntime: () => ({
    runtimeState: {
      inputs: {
        'prompt-node': {
          title: 'Desk lamp',
          bundle: {
            sku: 'LAMP-01',
          },
          value: 'Desk lamp',
        },
      },
    },
    onSendToAi: vi.fn(),
    sendingToAi: false,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNodeConfig: mockState.updateSelectedNodeConfig,
    toast: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  buildPromptOutput: () => ({ promptOutput: 'Resolved prompt' }),
  createParserMappings: () => ({}),
  formatRuntimeValue: (value: unknown) => String(value),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => ({
    effectiveModelId: '',
  }),
}));

vi.mock('@/features/ai/ai-paths/utils/ui-utils', () => ({
  formatPlaceholderLabel: (value: string) => value.toUpperCase(),
  formatPortLabel: (value: string) => value.toUpperCase(),
}));

vi.mock('@/shared/ui', () => ({
  ...(() => {
    const React = require('react') as typeof import('react');
    return {
      Button: ({
        children,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
        <button {...props}>{children}</button>
      ),
      Textarea: React.forwardRef<
        HTMLTextAreaElement,
        React.TextareaHTMLAttributes<HTMLTextAreaElement>
      >(function MockTextarea(props, ref): React.JSX.Element {
        return <textarea ref={ref} {...props} />;
      }),
      Alert: ({ children }: { children?: React.ReactNode }): React.JSX.Element => (
        <div>{children}</div>
      ),
      FormField: ({
        label,
        description,
        children,
      }: {
        label: React.ReactNode;
        description?: React.ReactNode;
        children: React.ReactNode;
      }): React.JSX.Element => (
        <label>
          <span>{label}</span>
          {description ? <span>{description}</span> : null}
          {children}
        </label>
      ),
    };
  })(),
}));

vi.mock('../node-config/dialog/database/PlaceholderMatrixDialog', () => ({
  PlaceholderMatrixDialog: (): null => null,
}));

import { PromptNodeConfigSection } from '../node-config/dialog/PromptNodeConfigSection';

describe('PromptNodeConfigSection', () => {
  beforeEach(() => {
    mockState.updateSelectedNodeConfig.mockReset();
  });

  it('renders placeholder chips as native buttons and inserts placeholders on click', () => {
    render(<PromptNodeConfigSection />);

    const directInputButton = screen.getByRole('button', { name: 'TITLE' });
    const bundleKeyButton = screen.getByRole('button', { name: 'SKU' });

    fireEvent.click(directInputButton);
    expect(
      mockState.updateSelectedNodeConfig.mock.calls[0]?.[0]?.prompt?.template ?? ''
    ).toContain('{{title}}');

    fireEvent.click(bundleKeyButton);
    expect(
      mockState.updateSelectedNodeConfig.mock.calls[1]?.[0]?.prompt?.template ?? ''
    ).toContain('{{sku}}');
  });
});
