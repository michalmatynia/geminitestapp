import { describe, expect, it } from 'vitest';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import * as builders from './client-native-code-object-registry-contract-subset.builders';
import {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
} from '../engine-client';

const {
  mockDbApiSchema,
  mockAiJobsEnqueue,
  mockAiJobsPoll,
  mockAgentEnqueue,
  mockAgentPoll,
  mockSettingsList,
  mockLearnerAgentsChat,
  mockPlaywrightEnqueue,
  mockPlaywrightPoll,
} = builders;

describe('client native code-object registry contract subset', () => {
  it('only contains codeObjectIds that exist in native contracts', () => {
    const nativeContractIds = builders.readNativeContractCodeObjectIdSet();

    expect(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.length).toBeGreaterThan(0);
    CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.forEach((codeObjectId: string) => {
      expect(nativeContractIds.has(codeObjectId)).toBe(true);
    });
  });

  it('covers all client-supported runtime-kernel node types with native mappings', () => {
    const byNodeType = builders.readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);
    const missingNodeTypes = CLIENT_LEGACY_HANDLER_NODE_TYPES.filter(
      (nodeType: string): boolean => {
        const contractCodeObjectId = byNodeType.get(nodeType);
        if (!contractCodeObjectId) return false;
        return !clientNativeIdSet.has(contractCodeObjectId);
      }
    );

    expect(missingNodeTypes).toEqual([]);
  });

  it('tracks remaining server-only native node-type asymmetries explicitly', () => {
    const byNodeType = builders.readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);

    const unsupportedOnClientNodeTypes = Array.from(byNodeType.entries())
      .filter(([, codeObjectId]: [string, string]) => !clientNativeIdSet.has(codeObjectId))
      .map(([nodeType]: [string, string]) => nodeType)
      .sort();

    expect(unsupportedOnClientNodeTypes).toEqual([]);
  });

  it('executes prompt nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode()],
      edges: [],
      runtimeKernelNodeTypes: ['prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-prompt']?.['prompt']).toBe('hello-from-prompt');
  });

  it('executes model nodes through client native contract resolver mapping', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelNode()],
      edges: [
        {
          id: 'edge-prompt-model',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAiJobsEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'graph_model',
      })
    );
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-model']?.['status']).toBe('queued');
    expect(result.outputs?.['node-model']?.['jobId']).toBe('job-model-1');
  });

  it('waits for template-referenced prompt inputs before starting downstream model nodes', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const promptNode = {
      ...builders.buildPromptNode(),
      inputs: ['bundle', 'result'],
      config: {
        prompt: {
          template: 'Bundle {{bundle.title}} definitions {{result}}',
        },
      },
    };

    const result = await evaluateGraphClient({
      nodes: [
        builders.buildConstantNode({
          id: 'node-bundle',
          title: 'Bundle Source',
          value: { title: 'Silksong' },
        }),
        {
          ...builders.buildModelNode(),
          id: 'node-result-missing',
          title: 'Definitions Source',
        },
        promptNode,
        builders.buildModelNode(),
      ],
      edges: [
        {
          id: 'edge-bundle-prompt',
          from: 'node-bundle',
          to: 'node-prompt',
          fromPort: 'value',
          toPort: 'bundle',
          kind: 'value',
        },
        {
          id: 'edge-result-prompt',
          from: 'node-result-missing',
          to: 'node-prompt',
          fromPort: 'result',
          toPort: 'result',
          kind: 'value',
        },
        {
          id: 'edge-prompt-model-template-required',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['constant', 'prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).not.toHaveBeenCalled();
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-prompt']?.['status']).toBe('waiting_callback');
    expect(result.outputs?.['node-prompt']?.['blockedReason']).toBe('missing_inputs');
    expect(result.outputs?.['node-prompt']?.['waitingOnPorts']).toEqual(['result']);
    expect(result.outputs?.['node-model']?.['status']).toBe('waiting_callback');
    expect(result.outputs?.['node-model']?.['blockedReason']).toBe('missing_inputs');
    expect(result.outputs?.['node-model']?.['waitingOnPorts']).toEqual(['prompt']);
  });

  it('forwards contextRegistry into queued client model jobs', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const contextRegistry: ContextRegistryConsumerEnvelope = {
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      engineVersion: 'test-engine',
    };

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelNode()],
      edges: [
        {
          id: 'edge-prompt-model-context',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      contextRegistry,
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAiJobsEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'graph_model',
        payload: expect.objectContaining({
          contextRegistry,
        }),
      })
    );
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-model']?.['status']).toBe('queued');
  });

  it('forwards graph.requestedModelId for client model jobs when the node selects a model', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const modelNode = {
      ...builders.buildModelNode(),
      config: {
        model: {
          waitForResult: false,
          temperature: 0.7,
          maxTokens: 256,
          vision: false,
          modelId: 'gpt-4o-mini',
        },
      },
    };

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), modelNode],
      edges: [
        {
          id: 'edge-prompt-model-requested-model',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'graph_model',
        payload: expect.objectContaining({
          modelId: 'gpt-4o-mini',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          graph: expect.objectContaining({
            requestedModelId: 'gpt-4o-mini',
          }),
        }),
      })
    );
    expect(result.outputs?.['node-model']?.['status']).toBe('queued');
  });

  it('blocks model nodes when prompt input is missing', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildModelNode()],
      edges: [],
      runtimeKernelNodeTypes: ['model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).not.toHaveBeenCalled();
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-model']?.['status']).toBe('blocked');
    expect(result.outputs?.['node-model']?.['blockedReason']).toBe('missing_inputs');
    expect(result.outputs?.['node-model']?.['waitingOnPorts']).toEqual(['prompt']);
  });

  it('skips model nodes when AI jobs are disabled', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelNode()],
      edges: [
        {
          id: 'edge-prompt-model-skip-ai-jobs',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      skipAiJobs: true,
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).not.toHaveBeenCalled();
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-model']?.['status']).toBe('skipped');
    expect(result.outputs?.['node-model']?.['skipReason']).toBe('ai_jobs_disabled');
  });

  it('executes model wait-for-result path through client native contract resolver mapping', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelWaitNode()],
      edges: [
        {
          id: 'edge-prompt-model-wait',
          from: 'node-prompt',
          to: 'node-model-wait',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAiJobsPoll).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-model-wait']?.['status']).toBe('completed');
    expect(result.outputs?.['node-model-wait']?.['result']).toBe('model-result');
    expect(result.outputs?.['node-model-wait']?.['jobId']).toBe('job-model-1');
  });

  it('marks model wait-for-result path as failed when poll reports failure', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();
    mockAiJobsPoll.mockResolvedValueOnce({
      ok: true as const,
      data: {
        status: 'failed',
        error: 'model-job-failed',
      },
    });

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelWaitNode()],
      edges: [
        {
          id: 'edge-prompt-model-wait-failed',
          from: 'node-prompt',
          to: 'node-model-wait',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAiJobsPoll).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-model-wait']?.['status']).toBe('failed');
    expect(result.outputs?.['node-model-wait']?.['error']).toBe('model-job-failed');
    expect(result.outputs?.['node-model-wait']?.['jobId']).toBe('job-model-1');
  });

  it('fails model nodes when enqueue response misses a valid job id', async () => {
    mockAiJobsEnqueue.mockClear();
    mockAiJobsPoll.mockClear();
    mockAiJobsEnqueue.mockResolvedValueOnce({
      ok: true as const,
      data: { jobId: ' ' },
    });

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildModelNode()],
      edges: [
        {
          id: 'edge-prompt-model-missing-job-id',
          from: 'node-prompt',
          to: 'node-model',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'model'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiJobsEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAiJobsPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-model']?.['status']).toBe('failed');
    expect(String(result.outputs?.['node-model']?.['error'] ?? '')).toContain(
      'did not include a valid job id'
    );
  });

  it('executes agent nodes through client native contract resolver mapping', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildAgentNode()],
      edges: [
        {
          id: 'edge-prompt-agent',
          from: 'node-prompt',
          to: 'node-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'hello-from-prompt',
      })
    );
    expect(mockAgentPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-agent']?.['status']).toBe('queued');
    expect(result.outputs?.['node-agent']?.['jobId']).toBe('agent-run-1');
  });

  it('blocks agent nodes when prompt input is missing', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildAgentNode()],
      edges: [],
      runtimeKernelNodeTypes: ['agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).not.toHaveBeenCalled();
    expect(mockAgentEnqueue).not.toHaveBeenCalled();
    expect(mockAgentPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-agent']?.['status']).toBe('blocked');
    expect(result.outputs?.['node-agent']?.['blockedReason']).toBe('missing_inputs');
    expect(result.outputs?.['node-agent']?.['waitingOnPorts']).toEqual(['prompt']);
  });

  it('skips agent nodes when AI jobs are disabled', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildAgentNode()],
      edges: [
        {
          id: 'edge-prompt-agent-skip-ai-jobs',
          from: 'node-prompt',
          to: 'node-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'agent'],
      skipAiJobs: true,
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).not.toHaveBeenCalled();
    expect(mockAgentEnqueue).not.toHaveBeenCalled();
    expect(mockAgentPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-agent']?.['status']).toBe('skipped');
    expect(result.outputs?.['node-agent']?.['skipReason']).toBe('ai_jobs_disabled');
    expect(result.outputs?.['node-agent']?.['bundle']).toMatchObject({
      status: 'skipped',
    });
  });

  it('executes agent wait-for-result path through client native contract resolver mapping', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildAgentWaitNode()],
      edges: [
        {
          id: 'edge-prompt-agent-wait',
          from: 'node-prompt',
          to: 'node-agent-wait',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAgentPoll).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-agent-wait']?.['status']).toBe('completed');
    expect(result.outputs?.['node-agent-wait']?.['result']).toBe('done');
    expect(result.outputs?.['node-agent-wait']?.['jobId']).toBe('agent-run-1');
  });

  it('marks agent wait-for-result path as failed when poll reports failure', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();
    mockAgentPoll.mockResolvedValueOnce({
      ok: true as const,
      data: {
        run: {
          id: 'agent-run-1',
          status: 'failed',
          errorMessage: 'agent-run-failed',
          logLines: [],
        },
      },
    });

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildAgentWaitNode()],
      edges: [
        {
          id: 'edge-prompt-agent-wait-failed',
          from: 'node-prompt',
          to: 'node-agent-wait',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAgentPoll).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-agent-wait']?.['status']).toBe('failed');
    expect(result.outputs?.['node-agent-wait']?.['jobId']).toBe('agent-run-1');
    expect(result.outputs?.['node-agent-wait']?.['bundle']).toMatchObject({
      runId: 'agent-run-1',
      status: 'failed',
    });
  });

  it('executes learner agent nodes through client native contract resolver mapping', async () => {
    mockLearnerAgentsChat.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildLearnerAgentNode()],
      edges: [
        {
          id: 'edge-prompt-learner-agent',
          from: 'node-prompt',
          to: 'node-learner-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'learner_agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockLearnerAgentsChat).toHaveBeenCalledTimes(1);
    expect(mockLearnerAgentsChat).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-1',
      })
    );
    expect(result.outputs?.['node-learner-agent']?.['status']).toBe('completed');
    expect(result.outputs?.['node-learner-agent']?.['result']).toBe('learner-response');
    expect(result.outputs?.['node-learner-agent']?.['sources']).toEqual([{ id: 'source-1' }]);
  });

  it('blocks learner agent nodes when agent id is missing', async () => {
    mockLearnerAgentsChat.mockClear();
    const learnerNodeMissingAgentId: AiNode = {
      ...builders.buildLearnerAgentNode(),
      id: 'node-learner-agent-missing-id',
      config: {
        learnerAgent: {
          agentId: '',
          promptTemplate: '',
          includeSources: true,
        },
      },
    };

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), learnerNodeMissingAgentId],
      edges: [
        {
          id: 'edge-prompt-learner-agent-missing-id',
          from: 'node-prompt',
          to: learnerNodeMissingAgentId.id,
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'learner_agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockLearnerAgentsChat).not.toHaveBeenCalled();
    expect(result.outputs?.[learnerNodeMissingAgentId.id]?.['status']).toBe('blocked');
    expect(result.outputs?.[learnerNodeMissingAgentId.id]?.['blockedReason']).toBe(
      'missing_agent_id'
    );
    expect(result.outputs?.[learnerNodeMissingAgentId.id]?.['bundle']).toMatchObject({
      status: 'blocked',
    });
  });

  it('skips learner agent nodes when AI jobs are disabled', async () => {
    mockLearnerAgentsChat.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildLearnerAgentNode()],
      edges: [
        {
          id: 'edge-prompt-learner-agent-skip-ai-jobs',
          from: 'node-prompt',
          to: 'node-learner-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'learner_agent'],
      skipAiJobs: true,
      reportAiPathsError: (): void => {},
    });

    expect(mockLearnerAgentsChat).not.toHaveBeenCalled();
    expect(result.outputs?.['node-learner-agent']?.['status']).toBe('skipped');
    expect(result.outputs?.['node-learner-agent']?.['skipReason']).toBe('ai_jobs_disabled');
    expect(result.outputs?.['node-learner-agent']?.['bundle']).toMatchObject({
      status: 'skipped',
    });
  });

  it('fails learner agent nodes when chat API responds with an error', async () => {
    mockLearnerAgentsChat.mockClear();
    mockLearnerAgentsChat.mockResolvedValueOnce({
      ok: false as const,
      error: 'learner-chat-failed',
    });

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildLearnerAgentNode()],
      edges: [
        {
          id: 'edge-prompt-learner-agent-failed',
          from: 'node-prompt',
          to: 'node-learner-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'learner_agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockLearnerAgentsChat).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-learner-agent']?.['status']).toBe('failed');
    expect(result.outputs?.['node-learner-agent']?.['bundle']).toMatchObject({
      agentId: 'agent-1',
      status: 'failed',
      error: 'learner-chat-failed',
    });
  });

  it('executes trigger nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildTriggerNode()],
      edges: [],
      runtimeKernelNodeTypes: ['trigger'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-trigger']?.['trigger']).toBe(true);
    expect(result.outputs?.['node-trigger']?.['triggerName']).toBe('manual');
  });

  it('executes simulation nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildSimulationNode()],
      edges: [],
      runtimeKernelNodeTypes: ['simulation'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-simulation']?.['entityType']).toBe('product');
    expect(result.outputs?.['node-simulation']?.['context']).toMatchObject({
      contextSource: 'simulation',
      simulationNodeId: 'node-simulation',
      entityType: 'product',
    });
  });

  it('executes fetcher nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildTriggerNode(), builders.buildFetcherNode()],
      edges: [
        {
          id: 'edge-trigger-fetcher',
          from: 'node-trigger',
          to: 'node-fetcher',
          fromPort: 'trigger',
          toPort: 'trigger',
          kind: 'signal',
        },
      ],
      runtimeKernelNodeTypes: ['trigger', 'fetcher'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-fetcher']?.['context']).toMatchObject({
      contextSource: 'trigger_fetcher',
      fetcherNodeId: 'node-fetcher',
    });
    expect(result.outputs?.['node-fetcher']?.['meta']).toMatchObject({
      fetcherResolvedSource: 'live_context',
    });
  });

  it('executes db schema nodes through client native contract resolver mapping', async () => {
    mockDbApiSchema.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildDbSchemaNode()],
      edges: [],
      runtimeKernelNodeTypes: ['db_schema'],
      reportAiPathsError: (): void => {},
    });

    expect(mockDbApiSchema).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-db-schema']?.['schema']).toMatchObject({
      provider: 'prisma',
      collections: [{ name: 'products' }],
    });
    expect(result.outputs?.['node-db-schema']?.['context']).toMatchObject({
      provider: 'prisma',
    });
    expect(
      String(
        (result.outputs?.['node-db-schema']?.['context'] as Record<string, unknown> | undefined)?.[
          'schemaText'
        ] ?? ''
      )
    ).toContain('Collection: products');
  });

  it('executes playwright nodes through client native contract resolver mapping', async () => {
    mockPlaywrightEnqueue.mockClear();
    mockPlaywrightPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [builders.buildPromptNode(), builders.buildPlaywrightNode()],
      edges: [
        {
          id: 'edge-prompt-playwright',
          from: 'node-prompt',
          to: 'node-playwright',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['prompt', 'playwright'],
      reportAiPathsError: (): void => {},
    });

    expect(mockPlaywrightEnqueue).not.toHaveBeenCalled();
    expect(mockPlaywrightPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-playwright']?.['status']).toBe('failed');
    expect(result.outputs?.['node-playwright']?.['bundle']).toMatchObject({
      status: 'failed',
      error: 'Playwright script is empty.',
    });
  });

  it('executes api advanced nodes through client native contract resolver mapping', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await evaluateGraphClient({
        nodes: [builders.buildApiAdvancedNode()],
        edges: [],
        runtimeKernelNodeTypes: ['api_advanced'],
        reportAiPathsError: (): void => {},
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.outputs?.['node-api-advanced']?.['success']).toBe(false);
      expect(result.outputs?.['node-api-advanced']?.['status']).toBe(0);
      expect(result.outputs?.['node-api-advanced']?.['route']).toBe('missing_url');
      expect(result.outputs?.['node-api-advanced']?.['error']).toBe('Missing URL');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('executes database nodes through client native contract resolver mapping', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await evaluateGraphClient({
        nodes: [builders.buildDatabaseNode()],
        edges: [],
        runtimeKernelNodeTypes: ['database'],
        reportAiPathsError: (): void => {},
      });
      const bundle = result.outputs?.['node-database']?.['bundle'] as
        | Record<string, unknown>
        | undefined;

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.outputs?.['node-database']?.['result']).toBeNull();
      expect(bundle).toMatchObject({
        guardrail: 'query-resolution',
        querySource: 'customTemplate',
      });
      expect(String(bundle?.['error'] ?? '')).toContain('No explicit query provided.');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('executes audio oscillator nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildAudioOscillatorNode()],
      edges: [],
      runtimeKernelNodeTypes: ['audio_oscillator'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-oscillator']?.['status']).toBe('ready');
    expect(result.outputs?.['node-audio-oscillator']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('executes audio speaker nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildAudioOscillatorNode(), builders.buildAudioSpeakerNode()],
      edges: [
        {
          id: 'edge-osc-speaker-audio-signal',
          from: 'node-audio-oscillator',
          to: 'node-audio-speaker',
          fromPort: 'audioSignal',
          toPort: 'audioSignal',
          kind: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['audio_oscillator', 'audio_speaker'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-speaker']?.['status']).toBe('unsupported_environment');
    expect(result.outputs?.['node-audio-speaker']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('executes http nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildHttpNode()],
      edges: [],
      runtimeKernelNodeTypes: ['http'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-http']?.['value']).toBeNull();
    expect(result.outputs?.['node-http']?.['bundle']).toMatchObject({
      ok: false,
      status: 0,
      error: 'Missing URL',
    });
  });

  it('executes poll nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [builders.buildPollNode()],
      edges: [],
      runtimeKernelNodeTypes: ['poll'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-poll']).toEqual({});
  });

  it('blocks legacy-backed nodes forced into runtime-kernel mode when no v3 contract exists', async () => {
    await expect(
      evaluateGraphClient({
        nodes: [builders.buildFunctionNode()],
        edges: [],
        runtimeKernelNodeTypes: ['function'],
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow(
      'Node type \'function\' is not supported in client-side execution. Use Server execution.'
    );
  });

  it('keeps unsupported server-only nodes blocked in client execution', async () => {
    await expect(
      evaluateGraphClient({
        nodes: [builders.buildUnsupportedClientNode()],
        edges: [],
        runtimeKernelNodeTypes: ['unsupported_client_node'],
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow(
      'Node type \'unsupported_client_node\' is not supported in client-side execution. Use Server execution.'
    );
  });
});
