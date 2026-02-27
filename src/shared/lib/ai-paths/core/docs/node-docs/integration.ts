import type { NodeConfigDocField } from '../node-docs.types';
import { COMMON_RUNTIME_FIELDS } from '../node-docs.constants';

export const httpDocs: NodeConfigDocField[] = [
  { path: 'http.url', description: 'Request URL.', defaultValue: '""' },
  {
    path: 'http.method',
    description: 'HTTP method.',
    defaultValue: 'GET',
  },
  {
    path: 'http.headers',
    description:
      'JSON string of request headers. Must be valid JSON.',
    defaultValue: '{...}',
  },
  {
    path: 'http.bodyTemplate',
    description:
      'Template for request body (JSON/text) using {{placeholders}} from incoming ports.',
    defaultValue: '""',
  },
  {
    path: 'http.responseMode',
    description: 'How to interpret the response: json/text/status.',
    defaultValue: 'json',
  },
  {
    path: 'http.responsePath',
    description:
      'Optional JSON path to extract from the response when responseMode is json.',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const apiAdvancedDocs: NodeConfigDocField[] = [
  { path: 'apiAdvanced.url', description: 'Request URL template.', defaultValue: '""' },
  {
    path: 'apiAdvanced.method',
    description: 'HTTP method including advanced methods (HEAD/OPTIONS).',
    defaultValue: 'GET',
  },
  {
    path: 'apiAdvanced.pathParamsJson',
    description:
      'JSON object for explicit path parameter substitution before request execution.',
    defaultValue: '{}',
  },
  {
    path: 'apiAdvanced.queryParamsJson',
    description:
      'JSON object for explicit query parameters. Values can include templates.',
    defaultValue: '{}',
  },
  {
    path: 'apiAdvanced.headersJson',
    description: 'JSON object for request headers.',
    defaultValue: '{}',
  },
  {
    path: 'apiAdvanced.authMode',
    description:
      'none/api_key/bearer/basic/oauth2_client_credentials/connection auth strategy.',
    defaultValue: 'none',
  },
  {
    path: 'apiAdvanced.responseMode',
    description: 'How to interpret response payload: json/text/status.',
    defaultValue: 'json',
  },
  {
    path: 'apiAdvanced.responsePath',
    description:
      'Optional JSON path selection from parsed response payload.',
    defaultValue: '""',
  },
  {
    path: 'apiAdvanced.outputMappingsJson',
    description:
      'JSON object mapping output port -> JSON path in response envelope.',
    defaultValue: '{}',
  },
  {
    path: 'apiAdvanced.retryEnabled',
    description: 'Enable/disable retry behavior.',
    defaultValue: 'true',
  },
  {
    path: 'apiAdvanced.retryAttempts',
    description: 'Maximum attempts including first request.',
    defaultValue: '2',
  },
  {
    path: 'apiAdvanced.retryOnStatusJson',
    description:
      'JSON array of status codes that should be retried when retries are enabled.',
    defaultValue: '[429,500,502,503,504]',
  },
  {
    path: 'apiAdvanced.paginationMode',
    description:
      'none/page/cursor/link pagination strategy.',
    defaultValue: 'none',
  },
  {
    path: 'apiAdvanced.errorRoutesJson',
    description:
      'JSON array of explicit error route matchers and target output ports.',
    defaultValue: '[]',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const playwrightDocs: NodeConfigDocField[] = [
  {
    path: 'playwright.personaId',
    description:
      'Optional Playwright Persona ID. When set, node runtime inherits persona browser fidelity settings.',
    defaultValue: '""',
  },
  {
    path: 'playwright.script',
    description:
      'User script that exports a default async function: `run({ browser, context, page, input, emit, artifacts, log, helpers })`.',
    defaultValue: '"export default async function run(...) { ... }"',
  },
  {
    path: 'playwright.waitForResult',
    description:
      'When true, waits for Playwright completion and emits final outputs. When false, emits runId/job status immediately.',
    defaultValue: 'true',
  },
  {
    path: 'playwright.timeoutMs',
    description: 'Per-run timeout budget in milliseconds.',
    defaultValue: '120000',
  },
  {
    path: 'playwright.browserEngine',
    description: 'Browser engine to launch: chromium/firefox/webkit.',
    defaultValue: 'chromium',
  },
  {
    path: 'playwright.startUrlTemplate',
    description:
      'Optional URL template rendered from incoming ports before script execution (example: https://example.com/{{entityId}}).',
    defaultValue: '""',
  },
  {
    path: 'playwright.launchOptionsJson',
    description:
      'Raw Playwright launch options JSON merged with persona-driven settings before browser launch.',
    defaultValue: '{}',
  },
  {
    path: 'playwright.contextOptionsJson',
    description:
      'Raw Playwright browser context options JSON applied when creating a context/page session.',
    defaultValue: '{}',
  },
  {
    path: 'playwright.settingsOverrides',
    description:
      'Optional partial override object for Playwright persona fields (headless, slowMo, timeouts, proxy, device emulation).',
    defaultValue: '{}',
  },
  {
    path: 'playwright.capture.screenshot',
    description: 'Capture final screenshot artifact on run completion.',
    defaultValue: 'true',
  },
  {
    path: 'playwright.capture.html',
    description: 'Capture final page HTML artifact on run completion.',
    defaultValue: 'false',
  },
  {
    path: 'playwright.capture.video',
    description: 'Enable Playwright video capture for the run context.',
    defaultValue: 'false',
  },
  {
    path: 'playwright.capture.trace',
    description: 'Enable Playwright trace collection and save trace.zip artifact.',
    defaultValue: 'false',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const promptDocs: NodeConfigDocField[] = [
  {
    path: 'prompt.template',
    description:
      'Template to produce final prompt text. Uses {{title}}, {{content_en}}, {{bundle}}, etc.',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const modelDocs: NodeConfigDocField[] = [
  {
    path: 'model.modelId',
    description: 'Brain-managed model identifier. Node value is stored for compatibility but runtime uses AI Brain routing.',
    defaultValue: 'AI Brain assignment',
  },
  {
    path: 'model.temperature',
    description: 'Brain-managed sampling temperature (0-2). Node value is ignored at runtime.',
    defaultValue: 'AI Brain assignment',
  },
  {
    path: 'model.maxTokens',
    description: 'Brain-managed maximum output tokens. Node value is ignored at runtime.',
    defaultValue: 'AI Brain assignment',
  },
  {
    path: 'model.systemPrompt',
    description: 'Brain-managed system prompt. Empty uses the provider default prompt.',
    defaultValue: 'AI Brain assignment',
  },
  {
    path: 'model.vision',
    description:
      'When true, image URLs are included as vision inputs if connected.',
    defaultValue: 'false',
  },
  {
    path: 'model.waitForResult',
    description:
      'When true, node waits and emits result. When false, emits jobId/status immediately.',
    defaultValue: 'true',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const agentDocs: NodeConfigDocField[] = [
  {
    path: 'agent.personaId',
    description:
      'Persona to use from Agent Creator. Empty means runtime defaults.',
    defaultValue: '""',
  },
  {
    path: 'agent.promptTemplate',
    description:
      'Optional template to build the agent prompt from incoming ports.',
    defaultValue: '""',
  },
  {
    path: 'agent.waitForResult',
    description:
      'When true, waits for completion and emits result. When false, emits jobId/status.',
    defaultValue: 'true',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const learnerAgentDocs: NodeConfigDocField[] = [
  {
    path: 'learnerAgent.agentId',
    description:
      'Learner agent identifier used to resolve embeddings source and runtime execution behavior.',
    defaultValue: '""',
  },
  {
    path: 'learnerAgent.promptTemplate',
    description:
      'Optional prompt template used to compose final query context before model execution.',
    defaultValue: '""',
  },
  {
    path: 'learnerAgent.includeSources',
    description:
      'When true, include matched source snippets in node outputs for downstream auditing.',
    defaultValue: 'true',
  },
  ...COMMON_RUNTIME_FIELDS,
];
