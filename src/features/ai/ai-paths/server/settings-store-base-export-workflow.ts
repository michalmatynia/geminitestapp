export const BASE_EXPORT_BLWO_PATH_ID = 'path_base_export_blwo_v1';
export const BASE_EXPORT_BLWO_PATH_NAME = 'Base Export Workflow (BLWo)';
export const BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID =
  '5f36f340-3d89-4f6f-a08f-2387f380b90b';
export const BASE_EXPORT_BLWO_TRIGGER_BUTTON_NAME = 'BLWo';

export const buildBaseExportBlwoPathConfigValue = (
  timestamp: string
): string =>
  JSON.stringify({
    id: BASE_EXPORT_BLWO_PATH_ID,
    version: 2,
    name: BASE_EXPORT_BLWO_PATH_NAME,
    description:
      'Product-row workflow export to Base.com launched by BLWo trigger button.',
    trigger: 'Product Row - BLWo',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: true,
    nodes: [
      {
        id: 'node-trigger-blwo',
        type: 'trigger',
        title: 'Trigger: BLWo Product Row',
        description: `User trigger button (${BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID}).`,
        inputs: [],
        outputs: ['trigger', 'triggerName'],
        position: { x: 40, y: 300 },
        config: {
          trigger: {
            event: BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID,
          },
        },
      },
      {
        id: 'node-fetcher-blwo',
        type: 'fetcher',
        title: 'Fetcher: Trigger Context',
        description: 'Resolve context, metadata, and entity identity from trigger input.',
        inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
        position: { x: 220, y: 300 },
        config: {
          fetcher: {
            sourceMode: 'live_context',
            entityType: 'product',
            entityId: '',
            productId: '',
          },
          runtime: {
            waitForInputs: true,
            inputContracts: {
              trigger: { required: true },
              context: { required: false },
              meta: { required: false },
              entityId: { required: false },
              entityType: { required: false },
            },
          },
        },
      },
      {
        id: 'node-http-default-connection',
        type: 'http',
        title: 'Default Base Connection',
        description: 'Load default Base connection from export settings.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType'],
        outputs: ['value', 'bundle'],
        position: { x: 390, y: 120 },
        config: {
          http: {
            url: '/api/integrations/exports/base/default-connection',
            method: 'GET',
            headers: '{}',
            bodyTemplate: '',
            responseMode: 'json',
            responsePath: '',
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        id: 'node-http-default-inventory',
        type: 'http',
        title: 'Default Base Inventory',
        description: 'Load default Base inventory from export settings.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType'],
        outputs: ['value', 'bundle'],
        position: { x: 390, y: 470 },
        config: {
          http: {
            url: '/api/integrations/exports/base/default-inventory',
            method: 'GET',
            headers: '{}',
            bodyTemplate: '',
            responseMode: 'json',
            responsePath: '',
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        id: 'node-map-connection-id',
        type: 'mapper',
        title: 'Map Connection ID',
        description: 'Expose connectionId as result output.',
        inputs: ['context', 'result', 'bundle', 'value'],
        outputs: ['result'],
        position: { x: 760, y: 120 },
        config: {
          mapper: {
            outputs: ['result'],
            mappings: {
              result: 'value.connectionId',
            },
          },
        },
      },
      {
        id: 'node-map-inventory-id',
        type: 'mapper',
        title: 'Map Inventory ID',
        description: 'Expose inventoryId as value output.',
        inputs: ['context', 'result', 'bundle', 'value'],
        outputs: ['value'],
        position: { x: 760, y: 470 },
        config: {
          mapper: {
            outputs: ['value'],
            mappings: {
              value: 'value.inventoryId',
            },
          },
        },
      },
      {
        id: 'node-bundle-export-input',
        type: 'bundle',
        title: 'Bundle Export Inputs',
        description: 'Combine productId, connectionId, and inventoryId.',
        inputs: [
          'context',
          'meta',
          'trigger',
          'triggerName',
          'result',
          'entityJson',
          'entityId',
          'entityType',
          'value',
          'errors',
          'valid',
          'description_en',
          'prompt',
        ],
        outputs: ['bundle'],
        position: { x: 1110, y: 300 },
        config: {
          bundle: {
            includePorts: ['entityId', 'entityType', 'result', 'value'],
          },
        },
      },
      {
        id: 'node-api-export-base',
        type: 'api_advanced',
        title: 'Export To Base',
        description:
          'Execute product export with explicit payload fields from workflow inputs.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType', 'cursor', 'page'],
        outputs: ['value', 'bundle', 'status', 'headers', 'items', 'route', 'error', 'success'],
        position: { x: 1460, y: 300 },
        config: {
          apiAdvanced: {
            url: '/api/integrations/products/{{bundle.entityId}}/export-to-base',
            method: 'POST',
            pathParamsJson: '{}',
            queryParamsJson: '{}',
            headersJson: '{\n  "Content-Type": "application/json"\n}',
            bodyTemplate:
              '{\n' +
              '  "productId": "{{bundle.entityId}}",\n' +
              '  "connectionId": "{{bundle.result}}",\n' +
              '  "inventoryId": "{{bundle.value}}",\n' +
              '  "requestId": "blwo:{{bundle.entityId}}:{{bundle.result}}:{{bundle.value}}"\n' +
              '}',
            bodyMode: 'json',
            timeoutMs: 45000,
            authMode: 'none',
            responseMode: 'json',
            responsePath: '',
            outputMappingsJson:
              '{\n  "value": "data",\n  "status": "status",\n  "success": "ok"\n}',
            retryEnabled: true,
            retryAttempts: 2,
            retryBackoff: 'fixed',
            retryBackoffMs: 800,
            retryMaxBackoffMs: 5000,
            retryJitterRatio: 0,
            retryOnStatusJson: '[429,500,502,503,504]',
            retryOnNetworkError: true,
            paginationMode: 'none',
            pageParam: 'page',
            limitParam: 'limit',
            startPage: 1,
            pageSize: 50,
            cursorParam: 'cursor',
            cursorPath: '',
            itemsPath: 'items',
            maxPages: 1,
            paginationAggregateMode: 'first_page',
            rateLimitEnabled: false,
            rateLimitRequests: 1,
            rateLimitIntervalMs: 1000,
            rateLimitConcurrency: 1,
            rateLimitOnLimit: 'wait',
            idempotencyEnabled: false,
            idempotencyHeaderName: 'Idempotency-Key',
            idempotencyKeyTemplate: '',
            errorRoutesJson:
              '[\n  { "id": "http_error", "when": "status_range", "minStatus": 400, "maxStatus": 599, "outputPort": "error" },\n  { "id": "network_error", "when": "network", "outputPort": "error" },\n  { "id": "timeout", "when": "timeout", "outputPort": "error" }\n]',
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        id: 'node-viewer-export-result',
        type: 'viewer',
        title: 'Result Viewer',
        description: 'Inspect BLWo run outputs.',
        inputs: ['result', 'status', 'error', 'value', 'bundle', 'route', 'success'],
        outputs: [],
        position: { x: 1800, y: 300 },
      },
    ],
    edges: [
      {
        id: 'edge-blwo-00',
        from: 'node-trigger-blwo',
        to: 'node-fetcher-blwo',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-blwo-01',
        from: 'node-fetcher-blwo',
        to: 'node-http-default-connection',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-blwo-02',
        from: 'node-fetcher-blwo',
        to: 'node-http-default-inventory',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-blwo-03',
        from: 'node-http-default-connection',
        to: 'node-map-connection-id',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-blwo-04',
        from: 'node-http-default-inventory',
        to: 'node-map-inventory-id',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-blwo-05',
        from: 'node-fetcher-blwo',
        to: 'node-bundle-export-input',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-blwo-06',
        from: 'node-fetcher-blwo',
        to: 'node-bundle-export-input',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-blwo-07',
        from: 'node-map-connection-id',
        to: 'node-bundle-export-input',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-blwo-08',
        from: 'node-map-inventory-id',
        to: 'node-bundle-export-input',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-blwo-09',
        from: 'node-bundle-export-input',
        to: 'node-api-export-base',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-blwo-10',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'value',
        toPort: 'result',
      },
      {
        id: 'edge-blwo-11',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'status',
        toPort: 'status',
      },
      {
        id: 'edge-blwo-12',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'error',
        toPort: 'error',
      },
      {
        id: 'edge-blwo-13',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-blwo-14',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'route',
        toPort: 'route',
      },
      {
        id: 'edge-blwo-15',
        from: 'node-api-export-base',
        to: 'node-viewer-export-result',
        fromPort: 'success',
        toPort: 'success',
      },
    ],
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
  });

export const needsBaseExportBlwoConfigUpgrade = (raw: string | null | undefined): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const version = typeof parsed['version'] === 'number' ? parsed['version'] : 0;
    if (version < 2) return true;
    const nodes = Array.isArray(parsed['nodes']) ? (parsed['nodes'] as unknown[]) : [];
    const hasTrigger = nodes.some((entry: unknown): boolean => {
      if (!entry || typeof entry !== 'object') return false;
      const node = entry as Record<string, unknown>;
      if (node['type'] !== 'trigger') return false;
      const config = node['config'];
      if (!config || typeof config !== 'object') return false;
      const trigger = (config as Record<string, unknown>)['trigger'];
      if (!trigger || typeof trigger !== 'object') return false;
      return (trigger as Record<string, unknown>)['event'] === BASE_EXPORT_BLWO_TRIGGER_BUTTON_ID;
    });
    const hasAdvancedApi = nodes.some((entry: unknown): boolean => {
      if (!entry || typeof entry !== 'object') return false;
      const node = entry as Record<string, unknown>;
      return node['type'] === 'api_advanced';
    });
    const hasFetcher = nodes.some((entry: unknown): boolean => {
      if (!entry || typeof entry !== 'object') return false;
      const node = entry as Record<string, unknown>;
      return node['type'] === 'fetcher';
    });
    return !hasTrigger || !hasFetcher || !hasAdvancedApi;
  } catch {
    return true;
  }
};
