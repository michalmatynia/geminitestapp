import { z } from 'zod';

/**
 * AI Path Node Types
 */
export const aiNodeTypeSchema = z.enum([
  'trigger',
  'fetcher',
  'simulation',
  'context',
  'audio_oscillator',
  'audio_speaker',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'logical_condition',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'playwright',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'document',
  'scanfile',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
  'bounds_normalizer',
  'canvas_output',
]);

export type AiNodeTypeDto = z.infer<typeof aiNodeTypeSchema>;
export type NodeType = AiNodeTypeDto;

/**
 * Canvas UI Types
 */
export type SvgDetailLevel = 'full' | 'compact' | 'skeleton';

/**
 * Audio Node Types
 */
export type AudioWaveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

