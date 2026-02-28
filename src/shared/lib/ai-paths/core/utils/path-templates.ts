import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

import {
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  normalizeAiPathsValidationConfig,
} from '../validation-engine/defaults';
import { FETCHER_INPUT_PORTS, FETCHER_OUTPUT_PORTS, STORAGE_VERSION } from '../constants';
import { palette } from '../definitions';
import { repairPathNodeIdentities } from './node-identity';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type AiPathTemplate = {
  /** Stable ID used to identify this template in code (never shown to users as the path id). */
  templateId: string;
  name: string;
  description: string;
  nodes: Omit<AiNode, 'createdAt' | 'updatedAt' | 'data'>[];
  edges: Pick<Edge, 'id' | 'from' | 'to' | 'fromPort' | 'toPort'>[];
};

// ---------------------------------------------------------------------------
// Gemma Vision — model-node variant (canonical)
// Canonical flow: Trigger → Fetcher → Prompt → Model → Regex → Bounds → Validator → Canvas Output
// trigger.trigger  → fetcher.trigger  (canonical trigger-fetcher handoff)
// trigger.context  → prompt.images   (imageUrl extracted by buildPromptOutput)
// fetcher.context  → bounds.context  (image dims for relative coordinate formats)
// prompt.prompt    → model.prompt    (detection instructions text)
// prompt.images    → model.images    (image URLs forwarded to vision model)
// ---------------------------------------------------------------------------

const GEMMA_VISION_MODEL_TEMPLATE: AiPathTemplate = {
  templateId: 'gemma_vision_object_analyser_model',
  name: 'Gemma Vision Object Analyser',
  description:
    'Image Studio → Fetcher → Prompt → vision model → bounds extraction → canvas repositioning. ' +
    'Edit detection instructions in the "Vision Prompt" node. ' +
    'Configure the model (modelId, temperature, systemPrompt) in the "Gemma Vision Analysis" node. ' +
    'Output: { left, top, width, height } consumed by Image Studio automatically.',
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      title: 'Image Studio Trigger',
      description:
        'Receives imageUrl, imageWidth, imageHeight, slotId, projectId from Image Studio object analysis.',
      inputs: [],
      outputs: ['context', 'trigger'],
      position: { x: 100, y: 400 },
      config: {
        trigger: {
          event: 'image_studio_object_analysis',
          contextMode: 'trigger_only',
        },
      },
    },
    {
      id: 'node-fetcher',
      type: 'fetcher',
      title: 'Resolve Trigger Context',
      description:
        'Resolves the live trigger context (imageUrl, imageWidth, imageHeight, slotId, projectId) into a structured output for downstream nodes.',
      inputs: FETCHER_INPUT_PORTS,
      outputs: FETCHER_OUTPUT_PORTS,
      position: { x: 440, y: 400 },
      config: {
        fetcher: {
          sourceMode: 'live_context',
        },
      },
    },
    {
      id: 'node-prompt',
      type: 'prompt',
      title: 'Vision Prompt',
      description:
        'Edit the template below to change what detection instructions are sent to the model. The image is passed via the images port wired from the trigger context.',
      inputs: ['images'],
      outputs: ['prompt', 'images'],
      position: { x: 780, y: 400 },
      config: {
        prompt: {
          template: [
            'You are a product image analysis system.',
            'Detect the main product or object in the image.',
            'Return ONLY valid JSON with NO additional text or markdown:',
            '{"objectBounds":{"left":0,"top":0,"width":0,"height":0},"confidence":0.0,"label":"object"}',
            'All pixel values must be integers representing the bounding box in source image pixel coordinates.',
          ].join('\n'),
        },
      },
    },
    {
      id: 'node-model',
      type: 'model',
      title: 'Gemma Vision Analysis',
      description:
        'Standard vision model node. Receives the prompt text and image URLs. Change modelId to switch models. Edit systemPrompt for a concise system role.',
      inputs: ['prompt', 'images'],
      outputs: ['result', 'jobId'],
      position: { x: 1120, y: 400 },
      config: {
        model: {
          modelId: 'gemma',
          vision: true,
          temperature: 0.1,
          maxTokens: 256,
          systemPrompt:
            'You are a vision AI assistant that analyses images and returns structured JSON.',
        },
      },
    },
    {
      id: 'node-regex',
      type: 'regex',
      title: 'Extract Bounds JSON',
      description: "Pulls the JSON object out of the model's text response.",
      inputs: ['value'],
      outputs: ['result'],
      position: { x: 1460, y: 400 },
      config: {
        regex: {
          pattern: '',
          mode: 'extract_json',
          matchMode: 'first',
          outputMode: 'object',
        },
      },
    },
    {
      id: 'node-bounds',
      type: 'bounds_normalizer',
      title: 'Normalise Bounds',
      description:
        'Converts model coordinates to standard {left,top,width,height}. Change inputFormat to match your model output.',
      inputs: ['value', 'context'],
      outputs: ['value'],
      position: { x: 1800, y: 400 },
      config: {
        boundsNormalizer: {
          inputFormat: 'pixels_tlwh',
          boundsPath: 'objectBounds',
          confidencePath: 'confidence',
          labelPath: 'label',
        },
      },
    },
    {
      id: 'node-validator',
      type: 'validator',
      title: 'Validate Bounds',
      description: 'Ensures all four bounding-box fields are present before passing downstream.',
      inputs: ['context'],
      outputs: ['context', 'valid', 'errors'],
      position: { x: 2140, y: 400 },
      config: {
        validator: {
          requiredPaths: ['left', 'top', 'width', 'height'],
          mode: 'all',
        },
      },
    },
    {
      id: 'node-canvas-output',
      type: 'canvas_output',
      title: 'Canvas Output',
      description:
        'Image Studio terminal node. Emits bounds at image_studio_bounds in run.result — no manual field mapping required.',
      inputs: ['value', 'confidence', 'label'],
      outputs: ['value'],
      position: { x: 2480, y: 400 },
      config: {
        canvasOutput: {
          outputKey: 'image_studio_bounds',
          confidencePath: 'confidence',
          labelPath: 'label',
        },
      },
    },
  ],
  edges: [
    // trigger.trigger → fetcher: canonical trigger-fetcher handoff
    { id: 'e1', from: 'node-trigger', to: 'node-fetcher', fromPort: 'trigger', toPort: 'trigger' },
    // trigger.context → prompt.images: imageUrl extracted by buildPromptOutput / extractImageUrls
    { id: 'e2', from: 'node-trigger', to: 'node-prompt', fromPort: 'context', toPort: 'images' },
    // fetcher.context → bounds: imageWidth/imageHeight for relative coordinate formats
    { id: 'e3', from: 'node-fetcher', to: 'node-bounds', fromPort: 'context', toPort: 'context' },
    // prompt → model: text prompt
    { id: 'e4', from: 'node-prompt', to: 'node-model', fromPort: 'prompt', toPort: 'prompt' },
    // prompt → model: image URLs forwarded to vision model
    { id: 'e5', from: 'node-prompt', to: 'node-model', fromPort: 'images', toPort: 'images' },
    // model → regex: raw text response
    { id: 'e6', from: 'node-model', to: 'node-regex', fromPort: 'result', toPort: 'value' },
    // regex → bounds_normalizer: extracted JSON object
    { id: 'e7', from: 'node-regex', to: 'node-bounds', fromPort: 'result', toPort: 'value' },
    // bounds_normalizer → validator: normalised bounds
    { id: 'e8', from: 'node-bounds', to: 'node-validator', fromPort: 'value', toPort: 'context' },
    // validator → canvas_output: validated bounds
    {
      id: 'e9',
      from: 'node-validator',
      to: 'node-canvas-output',
      fromPort: 'context',
      toPort: 'value',
    },
  ],
};

// ---------------------------------------------------------------------------
// Gemma Vision — api_advanced variant (canonical)
// For custom Gemma endpoints (Ollama, Google Gemini REST, HuggingFace, etc.).
// Canonical flow: Trigger → Fetcher → api_advanced → Regex → Bounds → Validator → Canvas Output
// trigger.trigger → fetcher.trigger  (canonical trigger-fetcher handoff)
// trigger.context → api.context     (imageUrl available as {{ context.imageUrl }} in bodyTemplate)
// fetcher.context → bounds.context  (imageWidth/imageHeight for relative coordinate formats)
// ---------------------------------------------------------------------------

const GEMMA_VISION_API_ADVANCED_TEMPLATE: AiPathTemplate = {
  templateId: 'gemma_vision_object_analyser_api',
  name: 'Gemma Vision Analyser (Custom API)',
  description:
    'Image Studio → Fetcher → custom vision REST API → bounds extraction → canvas repositioning. ' +
    'Fill in your API URL and auth in the "Vision API Call" node. ' +
    'Edit the bodyTemplate to change detection instructions. ' +
    'Supports Ollama, Google Gemini REST, HuggingFace, and any OpenAI-compatible endpoint.',
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      title: 'Image Studio Trigger',
      description:
        'Receives imageUrl, imageWidth, imageHeight, slotId, projectId from Image Studio object analysis.',
      inputs: [],
      outputs: ['context', 'trigger'],
      position: { x: 100, y: 400 },
      config: {
        trigger: {
          event: 'image_studio_object_analysis',
          contextMode: 'trigger_only',
        },
      },
    },
    {
      id: 'node-fetcher',
      type: 'fetcher',
      title: 'Resolve Trigger Context',
      description:
        'Resolves the live trigger context (imageUrl, imageWidth, imageHeight, slotId, projectId) into a structured output for downstream nodes.',
      inputs: FETCHER_INPUT_PORTS,
      outputs: FETCHER_OUTPUT_PORTS,
      position: { x: 440, y: 400 },
      config: {
        fetcher: {
          sourceMode: 'live_context',
        },
      },
    },
    {
      id: 'node-api',
      type: 'api_advanced',
      title: 'Vision API Call',
      description: [
        'Configure URL and auth here in the node config panel.',
        'Edit the bodyTemplate to change the system prompt or model name.',
        'Use {{ context.imageUrl }} to reference the image URL from the trigger context.',
        'Example Gemini body: {"contents":[{"parts":[{"text":"You are a product analysis system..."},{"file_data":{"mime_type":"image/jpeg","file_uri":"{{ context.imageUrl }}"}}]}]}',
      ].join(' '),
      inputs: ['context'],
      outputs: ['value', 'bundle'],
      position: { x: 780, y: 400 },
      config: {
        apiAdvanced: {
          url: 'http://localhost:11434/api/generate',
          method: 'POST',
          authMode: 'none',
          headersJson: '{"Content-Type":"application/json"}',
          bodyTemplate:
            '{"model":"gemma3","prompt":"You are a product image analysis system. Detect the main product or object in the image. Return ONLY valid JSON with NO additional text or markdown: {\\"objectBounds\\":{\\"left\\":0,\\"top\\":0,\\"width\\":0,\\"height\\":0},\\"confidence\\":0.0,\\"label\\":\\"object\\"}. All pixel values must be integers representing the bounding box in source image pixel coordinates.","images":["{{ context.imageUrl }}"],"stream":false}',
          responsePath: 'response',
          retryEnabled: true,
          retryAttempts: 1,
        },
      },
    },
    {
      id: 'node-regex',
      type: 'regex',
      title: 'Extract Bounds JSON',
      description: 'Pulls the JSON object out of the API response text.',
      inputs: ['value'],
      outputs: ['result'],
      position: { x: 1120, y: 400 },
      config: {
        regex: {
          pattern: '',
          mode: 'extract_json',
          matchMode: 'first',
          outputMode: 'object',
        },
      },
    },
    {
      id: 'node-bounds',
      type: 'bounds_normalizer',
      title: 'Normalise Bounds',
      description:
        'Converts API coordinates to standard {left,top,width,height}. Change inputFormat to match your API output.',
      inputs: ['value', 'context'],
      outputs: ['value'],
      position: { x: 1460, y: 400 },
      config: {
        boundsNormalizer: {
          inputFormat: 'pixels_tlwh',
          boundsPath: 'objectBounds',
          confidencePath: 'confidence',
          labelPath: 'label',
        },
      },
    },
    {
      id: 'node-validator',
      type: 'validator',
      title: 'Validate Bounds',
      description: 'Ensures all four bounding-box fields are present before passing downstream.',
      inputs: ['context'],
      outputs: ['context', 'valid', 'errors'],
      position: { x: 1800, y: 400 },
      config: {
        validator: {
          requiredPaths: ['left', 'top', 'width', 'height'],
          mode: 'all',
        },
      },
    },
    {
      id: 'node-canvas-output',
      type: 'canvas_output',
      title: 'Canvas Output',
      description:
        'Image Studio terminal node. Emits bounds at image_studio_bounds in run.result — no manual field mapping required.',
      inputs: ['value', 'confidence', 'label'],
      outputs: ['value'],
      position: { x: 2140, y: 400 },
      config: {
        canvasOutput: {
          outputKey: 'image_studio_bounds',
          confidencePath: 'confidence',
          labelPath: 'label',
        },
      },
    },
  ],
  edges: [
    // trigger.trigger → fetcher: canonical trigger-fetcher handoff
    { id: 'e1', from: 'node-trigger', to: 'node-fetcher', fromPort: 'trigger', toPort: 'trigger' },
    // trigger.context → api: imageUrl available as {{ context.imageUrl }} in bodyTemplate
    { id: 'e2', from: 'node-trigger', to: 'node-api', fromPort: 'context', toPort: 'context' },
    // fetcher.context → bounds: imageWidth/imageHeight for relative coordinate formats
    { id: 'e3', from: 'node-fetcher', to: 'node-bounds', fromPort: 'context', toPort: 'context' },
    // api → regex: raw API response text
    { id: 'e4', from: 'node-api', to: 'node-regex', fromPort: 'value', toPort: 'value' },
    // regex → bounds_normalizer: extracted JSON object
    { id: 'e5', from: 'node-regex', to: 'node-bounds', fromPort: 'result', toPort: 'value' },
    // bounds_normalizer → validator: normalised bounds
    { id: 'e6', from: 'node-bounds', to: 'node-validator', fromPort: 'value', toPort: 'context' },
    // validator → canvas_output: validated bounds
    {
      id: 'e7',
      from: 'node-validator',
      to: 'node-canvas-output',
      fromPort: 'context',
      toPort: 'value',
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PATH_TEMPLATES: AiPathTemplate[] = [
  GEMMA_VISION_MODEL_TEMPLATE,
  GEMMA_VISION_API_ADVANCED_TEMPLATE,
];

// ---------------------------------------------------------------------------
// Builder — converts a template to a full PathConfig
// ---------------------------------------------------------------------------

export const buildPathConfigFromTemplate = (id: string, template: AiPathTemplate): PathConfig => {
  const now = new Date().toISOString();
  const rawNodes: AiNode[] = template.nodes.map(
    (node): AiNode => ({
      createdAt: now,
      updatedAt: null,
      data: {},
      ...node,
    })
  );

  const config: PathConfig = {
    id,
    version: STORAGE_VERSION,
    name: template.name,
    description: template.description,
    trigger: 'image_studio_object_analysis',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: false,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: normalizeAiPathsValidationConfig(DEFAULT_AI_PATHS_VALIDATION_CONFIG),
    nodes: rawNodes,
    edges: template.edges as Edge[],
    updatedAt: now,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: rawNodes[0]?.id ?? null,
      configOpen: false,
    },
  };

  return repairPathNodeIdentities(config, { palette }).config;
};
