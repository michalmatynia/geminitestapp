'use client';

import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { PartialBinnedRoundStateDto } from './round-state-contracts';

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'preposition' | 'adverb';

export type SpeechToken = {
  id: string;
  label: string;
  part: PartOfSpeech;
  emoji: string;
};

export type SpeechBin = {
  id: PartOfSpeech;
  label: string;
  description: string;
  accent: KangurAccent;
  emoji: string;
};

export type Round = {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  accent: KangurAccent;
  parts: PartOfSpeech[];
  tokens: SpeechToken[];
  visual: 'cards' | 'graph' | 'preposition';
};

export type RoundState = PartialBinnedRoundStateDto<SpeechToken, PartOfSpeech>;
