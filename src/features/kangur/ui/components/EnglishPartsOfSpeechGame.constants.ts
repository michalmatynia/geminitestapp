'use client';

import type { PartOfSpeech, Round, SpeechBin } from './EnglishPartsOfSpeechGame.types';

export const PART_META: Record<PartOfSpeech, Omit<SpeechBin, 'id'>> = {
  noun: {
    label: 'Noun',
    description: 'Person, thing, idea',
    accent: 'sky',
    emoji: '🔷',
  },
  verb: {
    label: 'Verb',
    description: 'Action or movement',
    accent: 'emerald',
    emoji: '⚡',
  },
  adjective: {
    label: 'Adjective',
    description: 'Describes a quality',
    accent: 'amber',
    emoji: '✨',
  },
  preposition: {
    label: 'Preposition',
    description: 'Place or relation',
    accent: 'violet',
    emoji: '📍',
  },
  adverb: {
    label: 'Adverb',
    description: 'How? when? how often?',
    accent: 'indigo',
    emoji: '💫',
  },
};

export const ROUNDS: Round[] = [
  {
    id: 'math-core',
    title: 'Math starter pack',
    prompt: 'Sort the words into the correct part of speech.',
    hint: 'Noun = thing, Verb = action, Adjective = quality.',
    accent: 'sky',
    parts: ['noun', 'verb', 'adjective'],
    tokens: [
      { id: 'core-equation', label: 'equation', part: 'noun', emoji: '📘' },
      { id: 'core-triangle', label: 'triangle', part: 'noun', emoji: '🔺' },
      { id: 'core-solve', label: 'solve', part: 'verb', emoji: '⚡' },
      { id: 'core-calculate', label: 'calculate', part: 'verb', emoji: '🧮' },
      { id: 'core-linear', label: 'linear', part: 'adjective', emoji: '📈' },
      { id: 'core-precise', label: 'precise', part: 'adjective', emoji: '🎯' },
    ],
    visual: 'cards',
  },
  {
    id: 'positions',
    title: 'Geometry positions',
    prompt: 'Sort the words about place and action.',
    hint: 'Prepositions show relations: between, above.',
    accent: 'violet',
    parts: ['noun', 'verb', 'preposition'],
    tokens: [
      { id: 'pos-angle', label: 'angle', part: 'noun', emoji: '📐' },
      { id: 'pos-variable', label: 'variable', part: 'noun', emoji: '🔣' },
      { id: 'pos-measure', label: 'measure', part: 'verb', emoji: '📏' },
      { id: 'pos-compare', label: 'compare', part: 'verb', emoji: '⚖️' },
      { id: 'pos-between', label: 'between', part: 'preposition', emoji: '↔️' },
      { id: 'pos-above', label: 'above', part: 'preposition', emoji: '⬆️' },
    ],
    visual: 'preposition',
  },
  {
    id: 'speed',
    title: 'Adverbs in action',
    prompt: 'Add tempo and style to the action.',
    hint: 'Adverbs describe how: quickly, carefully.',
    accent: 'amber',
    parts: ['verb', 'adverb', 'adjective'],
    tokens: [
      { id: 'speed-rotate', label: 'rotate', part: 'verb', emoji: '🔄' },
      { id: 'speed-simplify', label: 'simplify', part: 'verb', emoji: '🧩' },
      { id: 'speed-quickly', label: 'quickly', part: 'adverb', emoji: '💨' },
      { id: 'speed-carefully', label: 'carefully', part: 'adverb', emoji: '🧠' },
      { id: 'speed-accurate', label: 'accurate', part: 'adjective', emoji: '✅' },
      { id: 'speed-steep', label: 'steep', part: 'adjective', emoji: '⛰️' },
    ],
    visual: 'graph',
  },
];

export const TOTAL_ROUNDS = ROUNDS.length;
export const TOTAL_TOKENS = ROUNDS.reduce((sum, round) => sum + round.tokens.length, 0);
