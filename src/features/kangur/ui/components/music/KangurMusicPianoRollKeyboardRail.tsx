'use client';

import type { CSSProperties, MutableRefObject } from 'react';

import { cn } from '@/features/kangur/shared/utils';

import type {
  ActiveKeyPressState,
  ActiveSynthGestureState,
  KeyPulseState,
  SynthPitchResolution,
} from './KangurMusicPianoRoll.types';
import type {
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
} from './music-theory';
import {
  clamp,
  KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES,
  KANGUR_PIANO_ROLL_KEY_CLASSNAME,
  VIBRATO_DEAD_ZONE,
} from './KangurMusicPianoRoll.utils';

type KangurMusicPianoRollKeyboardRailProps<NoteId extends string> = {
  activePressesRef: MutableRefObject<Map<NoteId, ActiveKeyPressState>>;
  activeSynthGesture: ActiveSynthGestureState<NoteId> | null;
  activeSynthGestures: ActiveSynthGestureState<NoteId>[];
  activeSynthGesturesRef: MutableRefObject<Map<number, ActiveSynthGestureState<NoteId>>>;
  activeTransportStep: { noteId: NoteId } | null;
  expectedTransportStep: { noteId: NoteId } | null;
  isCoarsePointer: boolean;
  isCompactMobile: boolean;
  isInteractive: boolean;
  keyButtonRefs: MutableRefObject<Map<NoteId, HTMLButtonElement>>;
  keyDefinitionById: Map<NoteId, KangurMusicPianoKeyDefinition<NoteId>>;
  keys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  keyTestIdPrefix: string;
  pressedNoteId: NoteId | null;
  pressedVelocity: number | null;
  recentKeyPulses: Map<NoteId, KeyPulseState>;
  resolvedKeyboardMode: KangurMusicKeyboardMode;
  stepTestIdPrefix: string;
  synthAxisAnchors: Array<{
    key: KangurMusicPianoKeyDefinition<NoteId>;
    normalizedPosition: number;
  }>;
  syncActiveSynthGestures: () => void;
  onClearPress: (noteId: NoteId) => void;
  onEndSynthGesture: (
    gesture: ActiveSynthGestureState<NoteId>,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onResolveGestureDynamics: (activePress: ActiveKeyPressState) => {
    brightness: number;
    velocity: number;
  };
  onResolveSynthGestureDetails: (input: {
    anchorSemitonePosition: number;
    brightness: number;
    frequencyHz: number;
    interactionId: string;
    nearestSemitonePosition: number;
    noteId: NoteId;
    normalizedHorizontalPosition: number;
    pitchSemitonePosition: number;
    previousVibratoDepth?: number;
    pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch';
    velocity: number;
    normalizedVerticalPosition: number;
  }) => {
    brightness: number;
    frequencyHz: number;
    interactionId: string;
    keyboardMode: KangurMusicKeyboardMode;
    noteId: NoteId;
    normalizedHorizontalPosition: number;
    normalizedVerticalPosition: number;
    pitchCentsFromKey: number;
    pitchSemitoneOffset: number;
    pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch';
    stereoPan: number;
    velocity: number;
    vibratoDepth: number;
    vibratoRateHz: number;
  };
  onResolveSynthPitchAtPoint: (input: {
    clientX: number;
    fallbackKey: KangurMusicPianoKeyDefinition<NoteId>;
    fallbackRect: DOMRect;
    pointerType?: 'keyboard' | 'mouse' | 'pen' | 'touch';
    preferredNoteId?: NoteId;
  }) => SynthPitchResolution<NoteId>;
  onResolveVerticalPosition: (clientY: number, rect: DOMRect) => number;
  onStartPress: (
    noteId: NoteId,
    pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch',
    event?: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onSynthGestureChange?: (details: {
    brightness: number;
    frequencyHz: number;
    interactionId: string;
    keyboardMode: KangurMusicKeyboardMode;
    noteId: NoteId;
    normalizedHorizontalPosition: number;
    normalizedVerticalPosition: number;
    pitchCentsFromKey: number;
    pitchSemitoneOffset: number;
    pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch';
    stereoPan: number;
    velocity: number;
    vibratoDepth: number;
    vibratoRateHz: number;
  }) => void;
  onSynthGestureStart?: (details: {
    brightness: number;
    frequencyHz: number;
    interactionId: string;
    keyboardMode: KangurMusicKeyboardMode;
    noteId: NoteId;
    normalizedHorizontalPosition: number;
    normalizedVerticalPosition: number;
    pitchCentsFromKey: number;
    pitchSemitoneOffset: number;
    pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch';
    stereoPan: number;
    velocity: number;
    vibratoDepth: number;
    vibratoRateHz: number;
  }) => void;
  onTriggerKeyPulse: (noteId: NoteId, energy: number, phase: 'glide' | 'press') => void;
  onTriggerPress: (
    noteId: NoteId,
    options?: {
      interactionId?: string | null;
      keepPressActive?: boolean;
      pointerType?: 'keyboard' | 'mouse' | 'pen' | 'touch';
    },
  ) => { brightness: number; velocity: number } | null;
  onUpdatePressFromPointerEvent: (
    noteId: NoteId,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => ActiveKeyPressState | null;
};

export function KangurMusicPianoRollKeyboardRail<NoteId extends string>({
  activePressesRef,
  activeSynthGesture,
  activeSynthGestures,
  activeSynthGesturesRef,
  activeTransportStep,
  expectedTransportStep,
  isCoarsePointer,
  isCompactMobile,
  isInteractive,
  keyButtonRefs,
  keyDefinitionById,
  keys,
  keyTestIdPrefix,
  pressedNoteId,
  pressedVelocity,
  recentKeyPulses,
  resolvedKeyboardMode,
  stepTestIdPrefix,
  synthAxisAnchors,
  syncActiveSynthGestures,
  onClearPress,
  onEndSynthGesture,
  onResolveGestureDynamics,
  onResolveSynthGestureDetails,
  onResolveSynthPitchAtPoint,
  onResolveVerticalPosition,
  onStartPress,
  onSynthGestureChange,
  onSynthGestureStart,
  onTriggerKeyPulse,
  onTriggerPress,
  onUpdatePressFromPointerEvent,
}: KangurMusicPianoRollKeyboardRailProps<NoteId>): React.JSX.Element {
  return (
    <div
      className={cn(
        isCompactMobile
          ? 'overflow-x-auto px-1.5 pb-2 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden'
          : '',
      )}
      data-testid={`${stepTestIdPrefix}-keyboard-rail`}
    >
      {resolvedKeyboardMode === 'synth' ? (
        <div
          className={cn(
            'mb-3 rounded-[18px] border border-white/80 bg-white/75 px-3 py-2 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]',
            isCompactMobile ? 'min-w-max' : undefined,
          )}
          data-testid={`${stepTestIdPrefix}-synth-axis-guide-shell`}
        >
          <div className='flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700'>
            <span data-testid={`${stepTestIdPrefix}-synth-axis-guide-x`}>X = Pitch</span>
            <span data-testid={`${stepTestIdPrefix}-synth-axis-guide-y`}>Y = Vibrato</span>
          </div>
          <div
            className='relative mt-2 h-2 overflow-hidden rounded-full bg-slate-900/10'
            data-pan={activeSynthGesture ? activeSynthGesture.stereoPan.toFixed(2) : undefined}
            data-pitch-cents={activeSynthGesture ? String(activeSynthGesture.pitchCentsFromKey) : undefined}
            data-pitch-position={
              activeSynthGesture
                ? activeSynthGesture.normalizedHorizontalPosition.toFixed(2)
                : undefined
            }
            data-testid={`${stepTestIdPrefix}-synth-pitch-guide`}
          >
            <div className='absolute inset-0 bg-gradient-to-r from-sky-200 via-fuchsia-200 to-amber-200' />
            {synthAxisAnchors.map(({ key, normalizedPosition }) => (
              <div
                key={`synth-axis-anchor-${String(key.id)}`}
                className='absolute inset-y-0'
                data-active-anchor={activeSynthGesture?.visualNoteId === key.id ? 'true' : undefined}
                data-note-id={key.id}
                data-testid={`${stepTestIdPrefix}-synth-axis-anchor-${key.id}`}
                style={{
                  left: `calc(${(normalizedPosition * 100).toFixed(1)}% - 1px)`,
                }}
              >
                <div
                  className={cn(
                    'absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/25 transition',
                    activeSynthGesture?.visualNoteId === key.id && 'h-4 bg-slate-950/70',
                  )}
                />
              </div>
            ))}
            <div className='absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/80' />
            <div
              className='absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/80 bg-slate-950/85 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]'
              style={{
                left: `calc(${((activeSynthGesture?.normalizedHorizontalPosition ?? 0.5) * 100).toFixed(1)}% - 8px)`,
              }}
            />
          </div>
          <div className='mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.22em] text-slate-500'>
            {synthAxisAnchors.map(({ key }) => (
              <span
                key={`synth-axis-anchor-label-${String(key.id)}`}
                className={cn('transition', activeSynthGesture?.visualNoteId === key.id && 'text-slate-900')}
              >
                {key.shortLabel}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          isCompactMobile ? 'flex min-w-max gap-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8',
        )}
      >
        {keys.map((note) => {
          const isPressed = pressedNoteId === note.id;
          const isExpectedKey = expectedTransportStep?.noteId === note.id;
          const isActiveKey = activeTransportStep?.noteId === note.id;
          const activeSynthGesturesForKey =
            resolvedKeyboardMode === 'synth'
              ? activeSynthGestures.filter((gesture) => gesture.visualNoteId === note.id)
              : [];
          const activeSynthGestureForKey =
            activeSynthGesturesForKey[activeSynthGesturesForKey.length - 1] ?? null;
          const isActiveSynthKey = activeSynthGestureForKey !== null;
          const activeSynthVibratoOffset = isActiveSynthKey
            ? Number((((activeSynthGestureForKey?.normalizedVerticalPosition ?? 0.5) - 0.5) * 2).toFixed(2))
            : 0;
          const activeSynthVibratoDirection = !isActiveSynthKey
            ? 'idle'
            : (activeSynthGestureForKey?.vibratoDepth ?? 0) <= 0.01
              ? 'neutral'
              : activeSynthVibratoOffset < 0
                ? 'up'
                : 'down';
          const activeSynthVibratoFillExtent = Math.max(
            6,
            (activeSynthGestureForKey?.vibratoDepth ?? 0) * 50,
          );
          const resolvedPressedVelocity = isPressed
            ? clamp(pressedVelocity ?? 0.72, 0.24, 1)
            : null;
          const visualVelocity = isActiveSynthKey
            ? activeSynthGestureForKey.velocity
            : resolvedPressedVelocity;
          const visualBrightness = isActiveSynthKey
            ? activeSynthGestureForKey.brightness
            : resolvedPressedVelocity === null
              ? null
              : Number(clamp(0.34 + resolvedPressedVelocity * 0.58, 0.28, 1).toFixed(2));
          const visualEnergy =
            visualVelocity === null
              ? null
              : Number(
                  clamp(
                    visualVelocity * 0.68 + (visualBrightness ?? visualVelocity) * 0.32,
                    0.24,
                    1,
                  ).toFixed(2),
                );
          const keyState = isActiveSynthKey
            ? 'gliding'
            : isPressed
              ? 'pressed'
              : isActiveKey
                ? 'active'
                : isExpectedKey
                  ? 'expected'
                  : 'idle';
          const keyPulse = recentKeyPulses.get(note.id) ?? null;
          const pulseEnergy = keyPulse?.energy ?? 0;
          const visualMeterValue =
            visualEnergy ?? (isActiveKey ? 0.44 : isExpectedKey ? 0.34 : 0.18);
          const velocityStyle = (
            visualEnergy !== null
              ? {
                  [KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES.keyPressBrightness]: (
                    1 + visualEnergy * 0.16
                  ).toFixed(2),
                  [KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES.keyPressSaturation]: (
                    1 + (visualBrightness ?? visualEnergy) * 0.56
                  ).toFixed(2),
                  [KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES.keyVisualLift]: `-${(
                    visualEnergy * (isActiveSynthKey ? 4.8 : 3.6)
                  ).toFixed(1)}px`,
                  [KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES.keyVisualScale]: (
                    1 + visualEnergy * 0.06
                  ).toFixed(3),
                }
              : undefined
          ) as CSSProperties | undefined;
          const keyStyle = {
            ...(velocityStyle ?? {}),
            touchAction: resolvedKeyboardMode === 'synth' ? 'none' : undefined,
          } as CSSProperties;

          return (
            <button
              key={note.id}
              aria-label={note.ariaLabel}
              aria-pressed={isPressed || isExpectedKey || isActiveKey}
              className={cn(
                KANGUR_PIANO_ROLL_KEY_CLASSNAME,
                'group relative flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-left shadow-[0_24px_64px_-42px_rgba(15,23,42,0.46)] transition duration-75',
                note.buttonClassName,
                isCompactMobile
                  ? cn(
                      'w-[72px] min-h-[64px] min-w-[72px] shrink-0 rounded-[22px] px-2 py-2 text-[13px]',
                      isCoarsePointer && 'select-none',
                      isCoarsePointer &&
                        (resolvedKeyboardMode === 'synth' ? 'touch-none' : 'touch-manipulation'),
                    )
                  : cn(
                      'w-full min-h-[88px] rounded-[28px] px-3 py-3',
                      isCoarsePointer &&
                        cn(
                          'select-none',
                          resolvedKeyboardMode === 'synth' ? 'touch-none' : 'touch-manipulation',
                        ),
                    ),
                isCompactMobile && 'snap-start',
                isInteractive ? 'cursor-pointer' : 'cursor-default opacity-90',
                (isPressed || isExpectedKey || isActiveKey) &&
                  cn('ring-4 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.46)]', note.glowClassName),
                isExpectedKey && 'outline outline-2 outline-offset-2 outline-white/70',
                isActiveSynthKey &&
                  'ring-fuchsia-300/90 shadow-[0_30px_70px_-34px_rgba(192,38,211,0.45)]',
              )}
              data-active-glides={isActiveSynthKey ? activeSynthGesturesForKey.length : undefined}
              data-hit-energy={keyPulse ? pulseEnergy.toFixed(2) : undefined}
              data-hit-pulse={keyPulse?.phase}
              data-key-state={keyState}
              data-note-id={note.id}
              data-press-brightness={visualBrightness !== null ? visualBrightness.toFixed(2) : undefined}
              data-press-velocity={visualVelocity !== null ? visualVelocity.toFixed(2) : undefined}
              data-testid={`${keyTestIdPrefix}-${note.id}`}
              disabled={!isInteractive}
              onBlur={() => onClearPress(note.id)}
              onClick={(event) => {
                if (resolvedKeyboardMode === 'synth' && event.detail !== 0) {
                  return;
                }
                onTriggerPress(note.id);
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                  onStartPress(note.id, 'keyboard');
                }
              }}
              onPointerCancel={(event) => {
                onClearPress(note.id);
                const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                if (gesture) {
                  onEndSynthGesture(gesture, event);
                }
              }}
              onPointerDown={(event) => {
                const pointerType = (event.pointerType as 'keyboard' | 'mouse' | 'pen' | 'touch') || 'mouse';
                onStartPress(note.id, pointerType, event);

                if (resolvedKeyboardMode !== 'synth' || !isInteractive) {
                  return;
                }

                event.preventDefault();
                try {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                } catch {
                  // Pointer capture is a progressive enhancement.
                }
                const interactionId = `synth-${event.pointerId}-${String(note.id)}`;
                const pressDetails = onTriggerPress(note.id, {
                  interactionId,
                  keepPressActive: true,
                  pointerType,
                });
                if (!pressDetails) {
                  return;
                }

                const pitchResolution = onResolveSynthPitchAtPoint({
                  clientX: event.clientX,
                  fallbackKey: note,
                  fallbackRect: event.currentTarget.getBoundingClientRect(),
                  pointerType,
                });
                const keyRect = pitchResolution.keyRect;
                const synthDetails = onResolveSynthGestureDetails({
                  anchorSemitonePosition: pitchResolution.pitchSemitonePosition,
                  brightness: pressDetails.brightness,
                  frequencyHz: pitchResolution.frequencyHz,
                  interactionId,
                  nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                  normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                  normalizedVerticalPosition: onResolveVerticalPosition(event.clientY, keyRect),
                  noteId: pitchResolution.key.id,
                  pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                  previousVibratoDepth: undefined,
                  pointerType,
                  velocity: pressDetails.velocity,
                });
                const nextGesture: ActiveSynthGestureState<NoteId> = {
                  anchorSemitonePosition: pitchResolution.pitchSemitonePosition,
                  ...synthDetails,
                  keyRect,
                  pointerId: event.pointerId,
                  visualNoteId: pitchResolution.displayKey.id,
                };
                activeSynthGesturesRef.current.delete(event.pointerId);
                activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                syncActiveSynthGestures();
                onSynthGestureStart?.(synthDetails);
              }}
              onPointerMove={(event) => {
                const updatedPress = activePressesRef.current.has(note.id)
                  ? onUpdatePressFromPointerEvent(note.id, event)
                  : null;
                if (resolvedKeyboardMode !== 'synth') {
                  return;
                }

                const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                if (!gesture) {
                  return;
                }

                event.preventDefault();
                const liveDynamics =
                  updatedPress === null
                    ? { brightness: gesture.brightness, velocity: gesture.velocity }
                    : onResolveGestureDynamics(updatedPress);
                const fallbackKey = keyDefinitionById.get(gesture.noteId) ?? note;
                const pitchResolution = onResolveSynthPitchAtPoint({
                  clientX: event.clientX,
                  fallbackKey,
                  fallbackRect: gesture.keyRect,
                  pointerType: gesture.pointerType,
                  preferredNoteId: gesture.visualNoteId,
                });
                const targetKey = pitchResolution.key;
                const targetKeyRect = pitchResolution.keyRect;
                const displayKey = pitchResolution.displayKey;
                const synthDetails = onResolveSynthGestureDetails({
                  anchorSemitonePosition: gesture.anchorSemitonePosition,
                  brightness: Number(
                    clamp(gesture.brightness * 0.34 + liveDynamics.brightness * 0.66, 0.28, 1).toFixed(2),
                  ),
                  frequencyHz: pitchResolution.frequencyHz,
                  interactionId: gesture.interactionId,
                  nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                  normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                  normalizedVerticalPosition: onResolveVerticalPosition(event.clientY, targetKeyRect),
                  noteId: targetKey.id,
                  pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                  previousVibratoDepth: gesture.vibratoDepth,
                  pointerType: gesture.pointerType,
                  velocity: Number(clamp(gesture.velocity * 0.42 + liveDynamics.velocity * 0.58, 0.24, 1).toFixed(2)),
                });
                const nextGesture: ActiveSynthGestureState<NoteId> = {
                  anchorSemitonePosition: gesture.anchorSemitonePosition,
                  ...synthDetails,
                  keyRect: targetKeyRect,
                  pointerId: gesture.pointerId,
                  visualNoteId: displayKey.id,
                };
                if (displayKey.id !== gesture.visualNoteId) {
                  onTriggerKeyPulse(
                    displayKey.id,
                    synthDetails.velocity * 0.58 + synthDetails.brightness * 0.42,
                    'glide',
                  );
                }
                activeSynthGesturesRef.current.delete(event.pointerId);
                activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                syncActiveSynthGestures();
                onSynthGestureChange?.(synthDetails);
              }}
              onPointerUp={(event) => {
                const updatedPress = onUpdatePressFromPointerEvent(note.id, event);
                if (resolvedKeyboardMode !== 'synth') {
                  return;
                }

                const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                if (gesture) {
                  const fallbackKey = keyDefinitionById.get(gesture.noteId) ?? note;
                  const pitchResolution = onResolveSynthPitchAtPoint({
                    clientX: event.clientX,
                    fallbackKey,
                    fallbackRect: gesture.keyRect,
                    pointerType: gesture.pointerType,
                    preferredNoteId: gesture.visualNoteId,
                  });
                  const targetKey = pitchResolution.key;
                  const targetKeyRect = pitchResolution.keyRect;
                  const liveDynamics =
                    updatedPress === null
                      ? { brightness: gesture.brightness, velocity: gesture.velocity }
                      : onResolveGestureDynamics(updatedPress);
                  const finalGesture: ActiveSynthGestureState<NoteId> = {
                    anchorSemitonePosition: gesture.anchorSemitonePosition,
                    ...onResolveSynthGestureDetails({
                      anchorSemitonePosition: gesture.anchorSemitonePosition,
                      brightness: Number(
                        clamp(gesture.brightness * 0.28 + liveDynamics.brightness * 0.72, 0.28, 1).toFixed(2),
                      ),
                      frequencyHz: pitchResolution.frequencyHz,
                      interactionId: gesture.interactionId,
                      nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                      normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                      normalizedVerticalPosition: onResolveVerticalPosition(event.clientY, targetKeyRect),
                      noteId: targetKey.id,
                      pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                      previousVibratoDepth: gesture.vibratoDepth,
                      pointerType: gesture.pointerType,
                      velocity: Number(clamp(gesture.velocity * 0.34 + liveDynamics.velocity * 0.66, 0.24, 1).toFixed(2)),
                    }),
                    keyRect: targetKeyRect,
                    pointerId: gesture.pointerId,
                    visualNoteId: pitchResolution.displayKey.id,
                  };
                  activeSynthGesturesRef.current.delete(event.pointerId);
                  activeSynthGesturesRef.current.set(event.pointerId, finalGesture);
                  syncActiveSynthGestures();
                  onEndSynthGesture(finalGesture, event);
                }
                onClearPress(note.id);
              }}
              ref={(element) => {
                if (element) {
                  keyButtonRefs.current.set(note.id, element);
                  return;
                }
                keyButtonRefs.current.delete(note.id);
              }}
              style={keyStyle}
              type='button'
            >
              <div
                className='pointer-events-none absolute inset-0 rounded-[inherit] transition duration-100'
                style={{
                  background: `radial-gradient(circle at 50% 22%, rgba(255,255,255,${(0.14 + visualMeterValue * 0.22).toFixed(2)}), transparent 48%), linear-gradient(180deg, rgba(255,255,255,${(0.08 + visualMeterValue * 0.14).toFixed(2)}) 0%, rgba(255,255,255,0) 42%)`,
                }}
              />
              {keyPulse ? (
                <div
                  className='pointer-events-none absolute inset-0 rounded-[inherit] transition duration-200'
                  style={{
                    background:
                      keyPulse.phase === 'glide'
                        ? `radial-gradient(circle at 50% 50%, rgba(244,114,182,${(0.16 + pulseEnergy * 0.2).toFixed(2)}), rgba(255,255,255,${(0.08 + pulseEnergy * 0.12).toFixed(2)}) 34%, rgba(255,255,255,0) 68%)`
                        : `radial-gradient(circle at 50% 62%, rgba(255,255,255,${(0.18 + pulseEnergy * 0.24).toFixed(2)}), rgba(56,189,248,${(0.08 + pulseEnergy * 0.18).toFixed(2)}) 32%, rgba(56,189,248,0) 70%)`,
                    opacity: (0.48 + pulseEnergy * 0.32).toFixed(2),
                    transform: `scale(${(keyPulse.phase === 'glide' ? 1.02 + pulseEnergy * 0.04 : 0.98 + pulseEnergy * 0.08).toFixed(3)})`,
                  }}
                />
              ) : null}
              <div className='absolute inset-x-4 top-3 h-5 rounded-full bg-white/35 blur-md' />
              {resolvedKeyboardMode === 'synth' ? (
                <div className='pointer-events-none absolute inset-y-3 right-3 flex items-center'>
                  <div
                    className={cn(
                      'relative rounded-full bg-white/30 shadow-[inset_0_1px_2px_rgba(15,23,42,0.16)]',
                      isCompactMobile ? 'h-[calc(100%-0.5rem)] w-2.5' : 'h-full w-3',
                    )}
                    data-vibrato-depth={isActiveSynthKey ? (activeSynthGestureForKey?.vibratoDepth ?? 0).toFixed(2) : undefined}
                    data-vibrato-direction={isActiveSynthKey ? activeSynthVibratoDirection : undefined}
                    data-vibrato-rate={isActiveSynthKey ? activeSynthGestureForKey?.vibratoRateHz.toFixed(1) : undefined}
                  >
                    {isActiveSynthKey ? (
                      <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-900/55'>
                        Vib
                      </div>
                    ) : null}
                    <div
                      className='absolute left-[15%] right-[15%] rounded-full border border-white/35 bg-white/24 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
                      data-vibrato-neutral-zone={VIBRATO_DEAD_ZONE.toFixed(2)}
                      style={{
                        height: `${(VIBRATO_DEAD_ZONE * 100).toFixed(1)}%`,
                        top: `${((0.5 - VIBRATO_DEAD_ZONE / 2) * 100).toFixed(1)}%`,
                      }}
                    />
                    <div className='absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-900/35' />
                    {isActiveSynthKey ? (
                      <div
                        className={cn(
                          'absolute left-0 right-0 rounded-full',
                          activeSynthVibratoDirection === 'up'
                            ? 'bg-sky-300/60'
                            : activeSynthVibratoDirection === 'down'
                              ? 'bg-fuchsia-300/60'
                              : 'bg-slate-300/45',
                        )}
                        style={{
                          height: `${activeSynthVibratoFillExtent}%`,
                          top:
                            activeSynthVibratoDirection === 'up'
                              ? `calc(50% - ${activeSynthVibratoFillExtent}%)`
                              : activeSynthVibratoDirection === 'down'
                                ? '50%'
                                : `calc(50% - ${activeSynthVibratoFillExtent / 2}%)`,
                        }}
                      />
                    ) : null}
                    {isActiveSynthKey ? (
                      <div
                        className='absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)]'
                        style={{
                          top: `calc(${(activeSynthGestureForKey?.normalizedVerticalPosition ?? 0.5) * 100}% - 10px)`,
                        }}
                      />
                    ) : null}
                    {isActiveSynthKey ? (
                      <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-900/55'>
                        {Math.round((activeSynthGestureForKey?.vibratoDepth ?? 0) * 100)}%
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className='relative flex items-start justify-between gap-2'>
                <span
                  className={cn(
                    'font-black uppercase tracking-[0.28em] text-slate-50/85',
                    isCompactMobile ? 'text-[10px]' : 'text-[11px]',
                  )}
                >
                  {note.shortLabel}
                </span>
                <span
                  className={cn(
                    'rounded-full bg-white/35 font-bold uppercase tracking-[0.2em] text-slate-900/80',
                    isCompactMobile ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
                  )}
                >
                  {note.label}
                </span>
              </div>
              <div className='relative mt-auto'>
                <div
                  className={cn(
                    'font-black tracking-tight text-slate-950',
                    isCompactMobile ? 'text-lg' : 'text-xl',
                  )}
                >
                  {note.label}
                </div>
                {isActiveSynthKey ? (
                  <div
                    className={cn(
                      'inline-flex rounded-full bg-slate-950/10 font-black uppercase tracking-[0.18em] text-slate-900/70',
                      isCompactMobile ? 'mt-1 px-1.5 py-0.5 text-[9px]' : 'mt-2 px-2 py-1 text-[10px]',
                    )}
                  >
                    {activeSynthGestureForKey.pitchSemitoneOffset >= 0 ? '+' : ''}
                    {activeSynthGestureForKey.pitchSemitoneOffset.toFixed(1)} st
                  </div>
                ) : null}
                <div className={cn('font-medium text-slate-950/70', isCompactMobile ? 'text-[11px]' : 'text-xs')}>
                  {note.spokenLabel}
                </div>
                <div className='pointer-events-none mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/12 shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]'>
                  <div
                    className='h-full rounded-full bg-white/85 transition-[width,opacity,transform] duration-100'
                    style={{
                      opacity: isPressed || isActiveSynthKey ? 0.94 : isExpectedKey || isActiveKey ? 0.56 : 0.28,
                      transform: `translateZ(0) scaleY(${(0.92 + visualMeterValue * 0.16).toFixed(3)})`,
                      width: `${Math.round(visualMeterValue * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
