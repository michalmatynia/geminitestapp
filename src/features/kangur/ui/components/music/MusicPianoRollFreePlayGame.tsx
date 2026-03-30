'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS } from '@/features/kangur/games/music-piano-roll-contract';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';

import KangurMusicPianoRoll, {
  type KangurMusicKeyboardMode,
  type KangurMusicPianoKeyPressDetails,
  type KangurMusicSynthEnvelope,
  type KangurMusicSynthGestureDetails,
  type KangurMusicSynthGlideMode,
  type KangurMusicSynthOsc1Config,
  type KangurMusicSynthOsc2Config,
} from './KangurMusicPianoRoll';
import {
  DIATONIC_PIANO_KEYS,
  DIATONIC_PIANO_KEYS_BY_ID,
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG,
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG,
  type DiatonicNoteId,
} from './music-theory';
import { useKangurMusicSynth } from './useKangurMusicSynth';

export const MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS =
  KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS.freePlay;

export default function MusicPianoRollFreePlayGame({
  onFinish,
}: KangurMiniGameFinishActionProps): React.JSX.Element {
  const pressedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    isAudioBlocked,
    isAudioSupported,
    playNote,
    startSustainedNote,
    stop,
    stopAllSustainedNotes,
    stopSustainedNote,
    updateSustainedNote,
  } = useKangurMusicSynth<DiatonicNoteId>() as any;
  const [keyboardMode, setKeyboardMode] = useState<KangurMusicKeyboardMode>('piano');
  const [synthGlideMode, setSynthGlideMode] =
    useState<KangurMusicSynthGlideMode>('continuous');
  const [synthEnvelope, setSynthEnvelope] = useState<KangurMusicSynthEnvelope | undefined>(
    undefined
  );
  const [osc1Config, setOsc1Config] = useState<KangurMusicSynthOsc1Config>(
    KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG
  );
  const [osc2Config, setOsc2Config] = useState<KangurMusicSynthOsc2Config>(
    KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG
  );
  const [pressedNoteId, setPressedNoteId] = useState<DiatonicNoteId | null>(null);
  const [pressedVelocity, setPressedVelocity] = useState<number | null>(null);

  const clearPressedResetTimeout = useCallback((): void => {
    if (pressedResetTimeoutRef.current !== null) {
      globalThis.clearTimeout(pressedResetTimeoutRef.current);
      pressedResetTimeoutRef.current = null;
    }
  }, []);

  const pulsePressedKey = useCallback(
    (noteId: DiatonicNoteId, velocity: number): void => {
      clearPressedResetTimeout();
      setPressedNoteId(noteId);
      setPressedVelocity(velocity);
      pressedResetTimeoutRef.current = globalThis.setTimeout(() => {
        setPressedNoteId(null);
        setPressedVelocity(null);
        pressedResetTimeoutRef.current = null;
      }, 220);
    },
    [clearPressedResetTimeout]
  );

  const handleKeyPress = useCallback(
    (
      noteId: DiatonicNoteId,
      pressDetails: KangurMusicPianoKeyPressDetails
    ): void => {
      pulsePressedKey(noteId, pressDetails.velocity);

      if (pressDetails.keyboardMode !== 'piano') {
        return;
      }

      void playNote({
        brightness: pressDetails.brightness,
        ...DIATONIC_PIANO_KEYS_BY_ID[noteId],
        durationMs: 320,
        id: noteId,
        velocity: pressDetails.velocity,
      });
    },
    [playNote, pulsePressedKey]
  );

  const handleKeyboardModeChange = useCallback(
    (nextMode: KangurMusicKeyboardMode): void => {
      setKeyboardMode(nextMode);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthGlideModeChange = useCallback(
    (nextMode: KangurMusicSynthGlideMode): void => {
      setSynthGlideMode(nextMode);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthOscSettingsChange = useCallback(
    (nextOsc1: KangurMusicSynthOsc1Config, nextOsc2: KangurMusicSynthOsc2Config): void => {
      setOsc1Config(nextOsc1);
      setOsc2Config(nextOsc2);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthEnvelopeChange = useCallback(
    (nextEnvelope: KangurMusicSynthEnvelope): void => {
      setSynthEnvelope(nextEnvelope);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthGestureStart = useCallback(
    (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): void => {
      if (details.keyboardMode !== 'synth') {
        return;
      }

      pulsePressedKey(details.noteId, details.velocity);
      void startSustainedNote(
        {
          ...DIATONIC_PIANO_KEYS_BY_ID[details.noteId],
          brightness: details.brightness,
          frequencyHz: details.frequencyHz,
          id: details.noteId,
          stereoPan: details.stereoPan,
          velocity: details.velocity,
          vibratoDepth: details.vibratoDepth,
          vibratoRateHz: details.vibratoRateHz,
          waveform: osc1Config.waveform,
          envelope: synthEnvelope,
        },
        {
          interactionId: details.interactionId,
          osc1Volume: osc1Config.volume,
          osc2Config,
        }
      );
    },
    [osc1Config, osc2Config, pulsePressedKey, startSustainedNote, synthEnvelope]
  );

  const handleSynthGestureChange = useCallback(
    (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): void => {
      if (details.keyboardMode !== 'synth') {
        return;
      }

      updateSustainedNote({
        brightness: details.brightness,
        frequencyHz: details.frequencyHz,
        interactionId: details.interactionId,
        stereoPan: details.stereoPan,
        velocity: details.velocity,
        vibratoDepth: details.vibratoDepth,
        vibratoRateHz: details.vibratoRateHz,
      });
    },
    [updateSustainedNote]
  );

  const handleSynthGestureEnd = useCallback(
    (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): void => {
      stopSustainedNote(details.interactionId, {
        brightness: details.brightness,
        velocity: details.velocity,
      });
    },
    [stopSustainedNote]
  );

  useEffect(() => {
    return () => {
      clearPressedResetTimeout();
      stop();
      stopAllSustainedNotes({ immediate: true });
    };
  }, [clearPressedResetTimeout, stop, stopAllSustainedNotes]);

  return (
    <div className='w-full' data-testid={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.root}>
      <div className='flex w-full flex-col gap-4 px-2 sm:gap-5 sm:px-3'>
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-sky-200/80 bg-white/88 px-4 py-4 shadow-[0_24px_64px_-48px_rgba(14,116,144,0.5)]'>
          <div className='min-w-0 flex-1'>
            <div className='text-[11px] font-black uppercase tracking-[0.26em] text-sky-500'>
              Swobodny piano roll
            </div>
            <p className='mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700 sm:text-[15px]'>
              Graj bez zadania. W synth przesuwaj palec w poziomie, aby zmieniac pitch, a w
              pionie, aby dodac vibrato.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 text-xs font-bold'>
            <span
              className='rounded-full bg-sky-100 px-3 py-1 text-sky-800'
              data-testid={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.modeStatus}
            >
              Tryb: {keyboardMode === 'synth' ? 'synth' : 'piano'}
            </span>
            <span
              className='rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200'
              data-testid={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.audioStatus}
            >
              {!isAudioSupported
                ? 'Audio: niedostepne'
                : isAudioBlocked
                  ? 'Audio: odblokuj'
                  : 'Audio: gotowe'}
            </span>
          </div>
        </div>

        <KangurMusicPianoRoll
          description='Dotykaj dowolnych klawiszy i sprawdzaj, jak zmieniaja sie barwa, glide i vibrato.'
          keyTestIdPrefix={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.pianoRoll.keyPrefix}
          keyboardMode={keyboardMode}
          keys={DIATONIC_PIANO_KEYS}
          melody={[]}
          onKeyboardModeChange={handleKeyboardModeChange}
          onKeyPress={handleKeyPress}
          onSynthGlideModeChange={handleSynthGlideModeChange}
          onSynthGestureChange={handleSynthGestureChange}
          onSynthGestureEnd={handleSynthGestureEnd}
          onSynthGestureStart={handleSynthGestureStart}
          onSynthEnvelopeChange={handleSynthEnvelopeChange}
          onSynthOscSettingsChange={handleSynthOscSettingsChange}
          pressedNoteId={pressedNoteId}
          pressedVelocity={pressedVelocity}
          shellTestId={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.pianoRoll.shell}
          showSynthEnvelopeButton
          showKeyboardModeSwitch
          showMeasureGuides={false}
          showSynthGlideModeSwitch
          showSynthOscSettingsPanel
          stepTestIdPrefix={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.pianoRoll.stepPrefix}
          synthEnvelope={synthEnvelope}
          synthGlideMode={synthGlideMode}
          synthOsc1Config={osc1Config}
          synthOsc2Config={osc2Config}
          title='Swobodny piano roll'
        />

        <div className='flex justify-end'>
          <KangurButton
            data-testid={MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS.finishButton}
            onClick={() => {
              stop();
              stopAllSustainedNotes({ immediate: true });
              onFinish();
            }}
            size='md'
            type='button'
            variant='surface'
          >
            Wróć do lekcji
          </KangurButton>
        </div>
      </div>
    </div>
  );
}
