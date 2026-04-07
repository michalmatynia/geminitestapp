import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import {
  buildKangurLessonTtsContextInstructions,
} from '../context-registry/instructions';

export const resolveLocaleInstruction = (locale: string): string => {
  const normalizedLocale = locale.trim().toLowerCase();
  if (!normalizedLocale || normalizedLocale.startsWith('pl')) {
    return 'Speak in natural Polish for children learning math.';
  }
  if (normalizedLocale.startsWith('uk')) {
    return 'Speak in natural Ukrainian for children learning math.';
  }
  if (normalizedLocale.startsWith('en')) {
    return 'Speak in natural English for children learning math.';
  }

  return `Speak naturally in the requested locale ${locale.trim()}.`;
};

export const buildTtsInstructions = (input: {
  locale: string;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): string =>
  [
    resolveLocaleInstruction(input.locale),
    'Use a warm, realistic, calm teaching voice.',
    'Keep the pacing patient and clear.',
    'Read numbers, dates, and short lists carefully.',
    'Avoid sounding robotic or overly dramatic.',
    buildKangurLessonTtsContextInstructions(input.contextRegistry?.resolved),
  ]
    .filter(Boolean)
    .join(' ');
