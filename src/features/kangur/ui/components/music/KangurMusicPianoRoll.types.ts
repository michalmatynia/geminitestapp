'use client';

import type { ReactNode } from 'react';
import type {
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
} from './music-theory';

export type KangurMusicPointerType = 'keyboard' | 'mouse' | 'pen' | 'touch';

export type KangurMusicPianoKeyPressDetails = {
  brightness: number;
  intervalMs: number | null;
  interactionId: string | null;
  keyboardMode: KangurMusicKeyboardMode;
  pointerType: KangurMusicPointerType;
  pressDurationMs: number | null;
  pressure: number | null;
  travelDistancePx: number;
  velocity: number;
};

export type KangurMusicSynthGestureDetails<NoteId extends string> = {
  brightness: number;
  frequencyHz: number;
  interactionId: string;
  keyboardMode: KangurMusicKeyboardMode;
  noteId: NoteId;
  normalizedHorizontalPosition: number;
  normalizedVerticalPosition: number;
  pitchCentsFromKey: number;
  pitchSemitoneOffset: number;
  pointerType: KangurMusicPointerType;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
};

export type KangurMusicPianoRollStep<NoteId extends string> = {
  ariaLabel?: string;
  label?: ReactNode;
  noteId: NoteId;
  span?: number;
};

export type ActiveKeyPressState = {
  contactSpanPx: number | null;
  lastClientX: number | null;
  lastClientY: number | null;
  livePressure: number | null;
  lastSampledAtMs: number | null;
  movementSpeedPxPerSecond: number | null;
  peakPressure: number | null;
  pointerType: KangurMusicPointerType;
  startedAtMs: number;
  travelDistancePx: number;
};

export type ActiveSynthGestureState<NoteId extends string> = {
  anchorSemitonePosition: number;
  brightness: number;
  frequencyHz: number;
  interactionId: string;
  keyRect: DOMRect;
  noteId: NoteId;
  normalizedHorizontalPosition: number;
  normalizedVerticalPosition: number;
  pitchCentsFromKey: number;
  pitchSemitoneOffset: number;
  pointerId: number;
  pointerType: KangurMusicPointerType;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
  visualNoteId: NoteId;
};

export type KeyPulsePhase = 'glide' | 'press';

export type KeyPulseState = {
  energy: number;
  phase: KeyPulsePhase;
};

export type ResolvedPianoRollStep<NoteId extends string> = {
  ariaLabel: string;
  index: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  label: ReactNode;
  laneIndex: number;
  noteId: NoteId;
  span: number;
  startUnit: number;
};

export type SynthPitchCandidate<NoteId extends string> = {
  centerX: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  keyRect: DOMRect;
  semitonePosition: number;
};

export type SynthPitchResolution<NoteId extends string> = {
  displayKey: KangurMusicPianoKeyDefinition<NoteId>;
  displayKeyRect: DOMRect;
  frequencyHz: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  keyRect: DOMRect;
  nearestSemitonePosition: number;
  normalizedHorizontalPosition: number;
  pitchSemitonePosition: number;
};

export type KangurMusicPressDynamics = {
  brightness: number;
  velocity: number;
};

export type KangurMusicPressDynamicsInput = Pick<
  KangurMusicPianoKeyPressDetails,
  'intervalMs' | 'pointerType' | 'pressDurationMs' | 'pressure' | 'travelDistancePx'
> & {
  contactSpanPx?: number | null;
  movementSpeedPxPerSecond?: number | null;
};
