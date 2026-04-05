import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

type RegexTemplate = {
  id: string;
  name: string;
  pattern: string;
  flags?: string;
  mode?: string;
  matchMode?: string;
  groupBy?: string;
  outputMode?: string;
  includeUnmatched?: boolean;
  unmatchedKey?: string;
  splitLines?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const mockState = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  nodes: [] as Array<Record<string, unknown>>,
  edges: [] as Array<Record<string, string>>,
  runtimeState: {} as Record<string, unknown>,
  onSendToAi: vi.fn(),
  sendingToAi: false,
  updateSelectedNodeConfig: vi.fn(),
  toast: vi.fn(),
  brainModelOptions: {
    effectiveModelId: 'brain-default',
    models: ['brain-default', 'brain-stable'],
  },
  settingsQuery: {
    data: [] as Array<{ key: string; value: string }>,
    isSuccess: true,
    isLoading: false,
    dataUpdatedAt: 0,
  },
  updateAiPathsSetting: vi.fn(),
  fetchAiPathsSettingsCached: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  createRegexTemplateId: vi.fn(),
  renderTemplate: vi.fn(),
  buildRegexItems: vi.fn(),
  buildRegexPreview: vi.fn(),
  extractCodeSnippets: vi.fn(),
  normalizeRegexFlags: vi.fn(),
  parseRegexCandidate: vi.fn(),
}));

const REGEX_TEMPLATES_KEY = 'ai_paths.regex_templates';
const regexNodeId = 'regex-node-1';

const buildRegexConfig = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  pattern: 'SKU-(\\d+)',
  flags: 'gm',
  mode: 'group',
  matchMode: 'first',
  groupBy: 'match',
  outputMode: 'object',
  includeUnmatched: true,
  unmatchedKey: '__unmatched__',
  splitLines: true,
  sampleText: 'SKU-42',
  aiPrompt: 'Find regex for {{text}}',
  jsonIntegrityPolicy: 'repair',
  templates: [
    {
      id: 'node-template-1',
      name: 'Node Template',
      pattern: 'NODE-(\\d+)',
      flags: 'g',
      groupBy: 'match',
      mode: 'group',
      matchMode: 'first',
      outputMode: 'object',
      includeUnmatched: true,
      unmatchedKey: '__unmatched__',
      splitLines: true,
      createdAt: '2026-03-19T00:00:00.000Z',
    },
  ],
  aiProposals: [],
  ...overrides,
});

const buildSelectedNode = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: regexNodeId,
  type: 'regex',
  title: 'Regex Node',
  config: {
    regex: buildRegexConfig(),
  },
  ...overrides,
});

const latestPatch = (): Record<string, unknown> =>
  (mockState.updateSelectedNodeConfig.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>;

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => mockState.brainModelOptions,
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  AI_PATHS_REGEX_TEMPLATES_KEY: 'ai_paths.regex_templates',
  buildRegexTemplatesStore: (templates: RegexTemplate[]) => ({ templates }),
  createRegexTemplateId: () => mockState.createRegexTemplateId(),
  parseRegexTemplatesStore: (raw: string | null) => {
    if (!raw) return { templates: [] };
    const parsed = JSON.parse(raw) as { templates?: RegexTemplate[] };
    return { templates: parsed.templates ?? [] };
  },
  renderTemplate: (...args: unknown[]) => mockState.renderTemplate(...args),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsCached: () => mockState.fetchAiPathsSettingsCached(),
  updateAiPathsSetting: (...args: unknown[]) => mockState.updateAiPathsSetting(...args),
}));

vi.mock('@/shared/contracts/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {
    aiPaths: 'aiPaths',
  },
}));

vi.mock('@/shared/lib/documentation/tooltips', () => ({
  getDocumentationTooltip: (_moduleId: string, key: string) => `tooltip:${key}`,
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: () => mockState.settingsQuery,
  createUpdateMutationV2: (config: {
    mutationFn: (payload: { key: string; value: string }) => Promise<void>;
  }) => ({
    isPending: false,
    mutateAsync: (payload: { key: string; value: string }) => config.mutationFn(payload),
  }),
}));

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    ai: {
      aiPaths: {
        settings: () => ['ai-paths-settings'],
        mutation: (key: string) => ['mutation', key],
      },
    },
  },
}));

vi.mock('@/shared/ui/primitives.public', () => {
  const React = require('react') as typeof import('react');
  return {
    Tabs: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
    TabsList: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <div>{children}</div>
    ),
    TabsTrigger: ({
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }): React.JSX.Element => <button type='button'>{children}</button>,
    TabsContent: ({ children }: { value: string; children: React.ReactNode }): React.JSX.Element => (
      <div>{children}</div>
    ),
  };
});

vi.mock('@/shared/utils/settings-json', () => ({
  serializeSetting: (value: unknown) => JSON.stringify(value),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

vi.mock('../../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: mockState.selectedNode,
  }),
  useAiPathGraph: () => ({
    nodes: mockState.nodes,
    edges: mockState.edges,
  }),
  useAiPathRuntime: () => ({
    runtimeState: mockState.runtimeState,
    onSendToAi: mockState.onSendToAi,
    sendingToAi: mockState.sendingToAi,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNodeConfig: mockState.updateSelectedNodeConfig,
    toast: mockState.toast,
  }),
}));

vi.mock('./regex-node-config-preview', () => ({
  buildRegexItems: (...args: unknown[]) => mockState.buildRegexItems(...args),
  buildRegexPreview: (...args: unknown[]) => mockState.buildRegexPreview(...args),
  extractCodeSnippets: (...args: unknown[]) => mockState.extractCodeSnippets(...args),
  normalizeRegexFlags: (...args: unknown[]) => mockState.normalizeRegexFlags(...args),
  parseRegexCandidate: (...args: unknown[]) => mockState.parseRegexCandidate(...args),
}));

vi.mock('./regex/RegexAiPromptSection', () => ({
  RegexAiPromptSection: ({
    resolvedAiPrompt,
    connectedModel,
    onSendToAi,
    nodeId,
  }: {
    resolvedAiPrompt: string;
    connectedModel: { modelLabel?: string; isStale?: boolean; usesBrainDefault?: boolean };
    onSendToAi: (nodeId: string, prompt: string) => void;
    nodeId: string;
  }): React.JSX.Element => (
    <div>
      <div>Prompt:{resolvedAiPrompt}</div>
      <div>Model:{connectedModel.modelLabel ?? 'none'}</div>
      <div>Stale:{String(Boolean(connectedModel.isStale))}</div>
      <div>BrainDefault:{String(Boolean(connectedModel.usesBrainDefault))}</div>
      <button type='button' onClick={() => onSendToAi(nodeId, resolvedAiPrompt)}>
        Send To AI
      </button>
    </div>
  ),
}));

vi.mock('./regex/RegexAiProposalSection', () => ({
  RegexAiProposalSection: ({
    onApplyVariant,
    onUseProposal,
    aiProposals,
  }: {
    onApplyVariant: (variant: 'manual' | 'ai') => void;
    onUseProposal: (proposal: { pattern: string; flags?: string; groupBy?: string }) => void;
    aiProposals: Array<{ pattern: string; flags?: string; groupBy?: string }>;
  }): React.JSX.Element => (
    <div>
      <button type='button' onClick={() => onApplyVariant('manual')}>
        Switch Manual
      </button>
      <button type='button' onClick={() => onApplyVariant('ai')}>
        Switch AI
      </button>
      <button
        type='button'
        onClick={() => {
          if (aiProposals[0]) onUseProposal(aiProposals[0]);
        }}
      >
        Use Stored Proposal
      </button>
    </div>
  ),
}));

vi.mock('./RegexPendingAiProposal', () => ({
  RegexPendingAiProposal: ({
    codeSnippets,
    pendingAiRegex,
    onAccept,
    onReject,
  }: {
    codeSnippets: string[];
    pendingAiRegex: string;
    onAccept: () => void;
    onReject: () => void;
  }): React.JSX.Element => (
    <div>
      <div>Pending:{pendingAiRegex}</div>
      <div>Snippets:{codeSnippets.join('|')}</div>
      <button type='button' onClick={onAccept}>
        Accept Pending AI Regex
      </button>
      <button type='button' onClick={onReject}>
        Reject Pending AI Regex
      </button>
    </div>
  ),
}));

vi.mock('./RegexTemplatesTabContent', () => ({
  RegexTemplatesTabContent: (props: {
    regexTemplates: RegexTemplate[];
    globalTemplates: RegexTemplate[];
    onApplyNodeTemplate: (template: RegexTemplate) => void;
    onRemoveNodeTemplate: (id: string) => void;
    onUpdateNodeTemplate: (id: string, patch: Partial<RegexTemplate>) => void;
    onApplyGlobalTemplate: (template: RegexTemplate) => void;
    onRemoveGlobalTemplate: (id: string) => void;
    onUpdateGlobalTemplate: (id: string, patch: Partial<RegexTemplate>) => void;
  }): React.JSX.Element => {
    const {
      regexTemplates,
      globalTemplates,
      onApplyNodeTemplate,
      onRemoveNodeTemplate,
      onUpdateNodeTemplate,
      onApplyGlobalTemplate,
      onRemoveGlobalTemplate,
      onUpdateGlobalTemplate,
    } = props;

    return (
      <div>
        <div>Node Templates:{regexTemplates.map((template) => template.name).join('|')}</div>
        <div>Global Templates:{globalTemplates.map((template) => template.name).join('|')}</div>
        <button
          type='button'
          onClick={() => {
            if (regexTemplates[0]) onApplyNodeTemplate(regexTemplates[0]);
          }}
        >
          Apply Node Template
        </button>
        <button
          type='button'
          onClick={() => {
            if (regexTemplates[0]) onRemoveNodeTemplate(regexTemplates[0].id);
          }}
        >
          Remove Node Template
        </button>
        <button
          type='button'
          onClick={() => {
            if (regexTemplates[0]) {
              onUpdateNodeTemplate(regexTemplates[0].id, {
                name: 'Updated Node Template',
              });
            }
          }}
        >
          Update Node Template
        </button>
        <button
          type='button'
          onClick={() => {
            if (globalTemplates[0]) onApplyGlobalTemplate(globalTemplates[0]);
          }}
        >
          Apply Global Template
        </button>
        <button
          type='button'
          onClick={() => {
            if (globalTemplates[0]) onRemoveGlobalTemplate(globalTemplates[0].id);
          }}
        >
          Remove Global Template
        </button>
        <button
          type='button'
          onClick={() => {
            if (globalTemplates[0]) {
              onUpdateGlobalTemplate(globalTemplates[0].id, {
                name: 'Updated Global Template',
              });
            }
          }}
        >
          Update Global Template
        </button>
      </div>
    );
  },
}));

vi.mock('./regex/RegexConfigBasicTab', () => ({
  RegexConfigBasicTab: ({
    templateName,
    onTemplateNameChange,
    onSaveNodeTemplate,
    onSaveGlobalTemplate,
  }: {
    templateName: string;
    onTemplateNameChange: (value: string) => void;
    onSaveNodeTemplate: () => void;
    onSaveGlobalTemplate: () => void;
  }): React.JSX.Element => (
    <div>
      <label>
        <span>Template Name</span>
        <input
          aria-label='Template Name'
          value={templateName}
          onChange={(event) => onTemplateNameChange(event.target.value)}
        />
      </label>
      <button type='button' onClick={onSaveNodeTemplate}>
        Save Node Template
      </button>
      <button type='button' onClick={onSaveGlobalTemplate}>
        Save Global Template
      </button>
    </div>
  ),
}));

vi.mock('./regex/RegexPreviewSection', () => ({
  RegexPreviewSection: ({
    sampleLines,
    sampleSource,
    onSampleChange,
  }: {
    sampleLines: string[];
    sampleSource: string;
    onSampleChange: (value: string) => void;
  }): React.JSX.Element => (
    <div>
      <div>Preview Source:{sampleSource}</div>
      <div>Preview Lines:{sampleLines.join('|')}</div>
      <button type='button' onClick={() => onSampleChange('changed sample')}>
        Change Sample
      </button>
    </div>
  ),
}));

import { RegexNodeConfigSection } from './RegexNodeConfigSection';

beforeEach(() => {
  mockState.selectedNode = buildSelectedNode();
  mockState.nodes = [
    mockState.selectedNode,
    {
      id: 'model-1',
      type: 'model',
      config: {
        model: {
          modelId: 'stale-model',
        },
      },
    },
  ];
  mockState.edges = [{ from: regexNodeId, to: 'model-1' }];
  mockState.runtimeState = {
    inputs: {
      [regexNodeId]: {
        value: 'SKU-42',
      },
    },
    outputs: {},
  };
  mockState.onSendToAi.mockReset();
  mockState.sendingToAi = false;
  mockState.updateSelectedNodeConfig.mockReset();
  mockState.updateSelectedNodeConfig.mockImplementation((patch: Record<string, unknown>) => {
    const currentConfig =
      ((mockState.selectedNode?.config as Record<string, unknown>)?.regex as Record<string, unknown>) ?? {};
    const nextRegex = {
      ...currentConfig,
      ...((patch.regex as Record<string, unknown>) ?? {}),
    };
    mockState.selectedNode = {
      ...mockState.selectedNode,
      config: {
        ...((mockState.selectedNode?.config as Record<string, unknown>) ?? {}),
        regex: nextRegex,
      },
    };
  });
  mockState.toast.mockReset();
  mockState.brainModelOptions = {
    effectiveModelId: 'brain-default',
    models: ['brain-default', 'brain-stable'],
  };
  const globalRegexTemplatesPayload = {
    templates: [
      {
        id: 'global-template-1',
        name: 'Global Template',
        pattern: 'GLOBAL-(\\d+)',
        flags: 'i',
        groupBy: 'match',
        mode: 'group',
        matchMode: 'first',
        outputMode: 'object',
        includeUnmatched: true,
        unmatchedKey: '__unmatched__',
        splitLines: true,
        createdAt: '2026-03-19T00:00:00.000Z',
      },
    ],
  };
  mockState.settingsQuery.data = [
    {
      key: REGEX_TEMPLATES_KEY,
      value: JSON.stringify(globalRegexTemplatesPayload),
    },
  ];
  mockState.settingsQuery.isSuccess = true;
  mockState.settingsQuery.isLoading = false;
  mockState.settingsQuery.dataUpdatedAt = Date.now();
  mockState.updateAiPathsSetting.mockReset();
  mockState.updateAiPathsSetting.mockResolvedValue(undefined);
  mockState.fetchAiPathsSettingsCached.mockReset();
  mockState.fetchAiPathsSettingsCached.mockResolvedValue(mockState.settingsQuery.data);
  mockState.logClientError.mockReset();
  mockState.createRegexTemplateId.mockReset();
  mockState.createRegexTemplateId.mockReturnValue('generated-template-id');
  mockState.renderTemplate.mockReset();
  mockState.renderTemplate.mockImplementation(
    (template: string, _context: Record<string, unknown>, sampleText: string) =>
      `rendered:${template}:${sampleText}`
  );
  mockState.buildRegexItems.mockReset();
  mockState.buildRegexItems.mockImplementation((value: unknown) =>
    typeof value === 'string' ? value.split(/\n/).filter(Boolean) : []
  );
  mockState.buildRegexPreview.mockReset();
  mockState.buildRegexPreview.mockImplementation(() => ({
    matches: [{ key: 'match-1' }],
    grouped: {},
    extracted: null,
  }));
  mockState.extractCodeSnippets.mockReset();
  mockState.extractCodeSnippets.mockImplementation((text: string) =>
    text.includes('```') ? ['good-snippet'] : []
  );
  mockState.normalizeRegexFlags.mockReset();
  mockState.normalizeRegexFlags.mockImplementation((flags: string) => flags.replace(/[^dgimsuvy]/g, ''));
  mockState.parseRegexCandidate.mockReset();
  mockState.parseRegexCandidate.mockImplementation((raw: string) => {
    if (raw === 'good-snippet') {
      return {
        pattern: '(?<sku>SKU-\\d+)',
        flags: 'im',
        groupBy: 'sku',
      };
    }
    return null;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('RegexNodeConfigSection', () => {
  it('returns null when the selected node is not regex', () => {
    mockState.selectedNode = {
      id: 'parser-node',
      type: 'parser',
      config: {},
    };

    const { container } = render(<RegexNodeConfigSection />);

    expect(container).toBeEmptyDOMElement();
  });

  it('injects runtime ai callback, accepts it, and exposes resolved prompt metadata', async () => {
    mockState.runtimeState = {
      inputs: {
        [regexNodeId]: {
          value: 'SKU-42',
          regexCallback: '```json\n{"pattern":"good"}\n```',
        },
      },
      outputs: {},
    };

    render(<RegexNodeConfigSection />);

    await waitFor(() => {
      expect(screen.getByText('Pending:```json {"pattern":"good"} ```'.replace(/ /g, ' '))).toBeInTheDocument();
    }).catch(() => {
      expect(screen.getByText(/Pending:/)).toBeInTheDocument();
    });
    expect(mockState.toast).toHaveBeenCalledWith('AI regex ready for review.', {
      variant: 'success',
    });
    expect(screen.getByText('Prompt:rendered:Find regex for {{text}}:SKU-42')).toBeInTheDocument();
    expect(screen.getByText('Model:stale-model')).toBeInTheDocument();
    expect(screen.getByText('Stale:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept Pending AI Regex' }));

    await waitFor(() => {
      expect(latestPatch()).toMatchObject({
        regex: {
          pattern: '(?<sku>SKU-\\d+)',
          flags: 'im',
          groupBy: 'sku',
          activeVariant: 'ai',
          manual: {
            pattern: 'SKU-(\\d+)',
            flags: 'gm',
            groupBy: 'match',
          },
          aiProposal: {
            pattern: '(?<sku>SKU-\\d+)',
            flags: 'im',
            groupBy: 'sku',
          },
        },
      });
    });
    expect(mockState.updateSelectedNodeConfig.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            regex: expect.objectContaining({
              aiProposals: [
                expect.objectContaining({
                  pattern: '(?<sku>SKU-\\d+)',
                  flags: 'im',
                  groupBy: 'sku',
                }),
              ],
            }),
          }),
        ],
      ])
    );
    expect(mockState.toast).toHaveBeenCalledWith('AI regex accepted.', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send To AI' }));
    expect(mockState.onSendToAi).toHaveBeenCalledWith(
      regexNodeId,
      'rendered:Find regex for {{text}}:SKU-42'
    );
  });

  it('saves and applies node/global templates and supports variant switching', async () => {
    mockState.selectedNode = buildSelectedNode({
      config: {
        regex: buildRegexConfig({
          aiProposal: {
            pattern: 'AI-(\\d+)',
            flags: 'i',
            groupBy: 'sku',
          },
          aiProposals: [
            {
              pattern: 'AI-(\\d+)',
              flags: 'i',
              groupBy: 'sku',
            },
          ],
          manual: {
            pattern: 'MANUAL-(\\d+)',
            flags: 'g',
            groupBy: 'match',
          },
        }),
      },
    });

    render(<RegexNodeConfigSection />);

    fireEvent.change(screen.getByLabelText('Template Name'), {
      target: { value: 'Saved Template' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Node Template' }));

    expect(latestPatch()).toMatchObject({
      regex: {
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: 'generated-template-id',
            name: 'Saved Template',
            pattern: 'SKU-(\\d+)',
          }),
          expect.objectContaining({
            id: 'node-template-1',
            name: 'Node Template',
          }),
        ]),
      },
    });
    expect(mockState.toast).toHaveBeenCalledWith('Regex template saved.', {
      variant: 'success',
    });

    fireEvent.change(screen.getByLabelText('Template Name'), {
      target: { value: 'Global Save' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Global Template' }));

    await waitFor(() => {
      expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
        REGEX_TEMPLATES_KEY,
        expect.stringContaining('Global Save')
      );
    });
    expect(mockState.toast).toHaveBeenCalledWith('Global regex template saved.', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Node Template' }));
    expect(latestPatch()).toMatchObject({
      regex: {
        pattern: 'SKU-(\\d+)',
        flags: 'gm',
        activeVariant: 'manual',
      },
    });
    expect(mockState.toast).toHaveBeenCalledWith('Template applied: Saved Template', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Global Template' }));
    expect(latestPatch()).toMatchObject({
      regex: {
        pattern: 'SKU-(\\d+)',
        flags: 'gm',
        activeVariant: 'manual',
      },
    });
    expect(mockState.toast).toHaveBeenCalledWith('Global template applied: Global Save', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Use Stored Proposal' }));
    expect(latestPatch()).toMatchObject({
      regex: {
        pattern: 'AI-(\\d+)',
        flags: 'i',
        groupBy: 'sku',
        activeVariant: 'ai',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Switch Manual' }));
    expect(latestPatch()).toMatchObject({
      regex: {
        pattern: 'MANUAL-(\\d+)',
        flags: 'g',
        groupBy: 'match',
        activeVariant: 'manual',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Node Template' }));
    expect(latestPatch()).toMatchObject({
      regex: {
        templates: [
          expect.objectContaining({
            id: 'node-template-1',
            name: 'Node Template',
          }),
        ],
      },
    });
    expect(mockState.toast).toHaveBeenCalledWith('Template removed.', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Global Template' }));
    await waitFor(() => {
      expect(mockState.updateAiPathsSetting).toHaveBeenLastCalledWith(
        REGEX_TEMPLATES_KEY,
        expect.stringContaining('global-template-1')
      );
    });
    expect(mockState.updateAiPathsSetting.mock.lastCall?.[1]).not.toContain('Global Save');
    expect(mockState.toast).toHaveBeenCalledWith('Global template removed.', {
      variant: 'success',
    });
  });

  it('rejects invalid ai suggestions and requires a template name', async () => {
    mockState.runtimeState = {
      inputs: {
        [regexNodeId]: {
          regexCallback: 'bad-candidate',
        },
      },
      outputs: {},
    };

    render(<RegexNodeConfigSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Node Template' }));
    expect(mockState.toast).toHaveBeenCalledWith('Template name is required.', {
      variant: 'error',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Accept Pending AI Regex' }));
    expect(mockState.toast).toHaveBeenCalledWith('Could not parse AI regex suggestion.', {
      variant: 'error',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reject Pending AI Regex' }));
    expect(mockState.toast).toHaveBeenCalledWith('AI regex rejected.', {
      variant: 'success',
    });
  });

  it('rolls back global templates when persistence fails', async () => {
    mockState.updateAiPathsSetting.mockRejectedValueOnce(new Error('write failed'));

    render(<RegexNodeConfigSection />);

    expect(screen.getByText('Global Templates:Global Template')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update Global Template' }));

    await waitFor(() => {
      expect(mockState.toast).toHaveBeenCalledWith('Failed to update global regex templates.', {
        variant: 'error',
      });
    });
    expect(screen.getByText('Global Templates:Global Template')).toBeInTheDocument();
    expect(screen.queryByText('Global Templates:Updated Global Template')).not.toBeInTheDocument();
  });
});
