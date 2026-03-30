'use client';

import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export const OP_ACCENTS: Record<string, KangurAccent> = {
  addition: 'amber',
  subtraction: 'rose',
  multiplication: 'violet',
  division: 'sky',
  decimals: 'teal',
  powers: 'amber',
  roots: 'indigo',
  clock: 'indigo',
  calendar: 'emerald',
  geometry: 'teal',
  mixed: 'violet',
  english_basics: 'emerald',
  english_parts_of_speech: 'indigo',
  english_sentence_structure: 'violet',
  english_subject_verb_agreement: 'teal',
  english_going_to: 'sky',
  english_articles: 'amber',
  english_adjectives: 'indigo',
  english_comparatives_superlatives: 'violet',
  english_adverbs: 'violet',
  english_adverbs_frequency: 'sky',
  english_prepositions_time_place: 'rose',
};

export const SCORE_FETCH_LIMIT = 30;
