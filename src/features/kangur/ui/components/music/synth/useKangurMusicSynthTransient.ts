'use client';

import { useCallback } from 'react';
import {
  clamp,
  resolveBrightness,
  resolvePianoFilterProfile,
  resolveReverbSendGain,
  resolveVelocityEnvelope,
  trimTransientPolyphony,
  WAVE_SHAPER_CURVE,
} from '../useKangurMusicSynth.utils';
import {
  DEFAULT_DURATION_MS,
  DEFAULT_GAIN,
  DEFAULT_VELOCITY,
  type ActiveNode,
  type KangurMusicPlayableNote,
  type ReverbChain,
} from '../useKangurMusicSynth.types';
import { ensureCompressorNode, ensureReverbChain } from '../useKangurMusicSynth.audio';

export function useKangurMusicSynthTransient(
  _audioContextRef: React.MutableRefObject<AudioContext | null>,
  compressorNodeRef: React.MutableRefObject<DynamicsCompressorNode | null>,
  reverbChainRef: React.MutableRefObject<ReverbChain | null>,
  activeNodesRef: React.MutableRefObject<ActiveNode[]>,
  ensureAudioContext: () => Promise<AudioContext | null>,
  clearActivePlayback: () => void
) {
  const playTone = useCallback(
    async (
      note: KangurMusicPlayableNote<string>,
      options: { stopPrevious?: boolean } = {}
    ): Promise<boolean> => {
      if (options.stopPrevious !== false) {
        clearActivePlayback();
      }

      const context = await ensureAudioContext();
      if (!context) {
        return false;
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const durationMs = Math.max(120, Math.round(note.durationMs ?? DEFAULT_DURATION_MS));
      const durationSeconds = durationMs / 1000;
      const now = context.currentTime;
      const velocity = clamp(note.velocity ?? DEFAULT_VELOCITY, 0.22, 1);
      const brightness = resolveBrightness(note.brightness, velocity);
      const { attackSeconds, gain, releaseSeconds } = resolveVelocityEnvelope({
        durationSeconds,
        velocity,
      });
      const sustainUntil = Math.max(
        now + attackSeconds + 0.02,
        now + durationSeconds - releaseSeconds
      );
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);

      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      const pianoFilterProfile = resolvePianoFilterProfile(brightness);
      filterNode.frequency.setValueAtTime(pianoFilterProfile.attackHz, now);
      filterNode.frequency.exponentialRampToValueAtTime(
        pianoFilterProfile.sustainHz,
        now + durationSeconds
      );
      filterNode.Q.value = pianoFilterProfile.q;

      const oscillator2 = context.createOscillator();
      const blendGainNode = context.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.detune.value = 4;
      blendGainNode.gain.value = 0.22 + brightness * 0.24;

      const transientOscillator = context.createOscillator();
      const transientGainNode = context.createGain();
      transientOscillator.type = brightness > 0.72 ? 'square' : 'triangle';
      transientOscillator.frequency.setValueAtTime(note.frequencyHz * 2, now);
      transientGainNode.gain.setValueAtTime(
        clamp(resolvedGain * (0.12 + brightness * 0.18), 0.0001, 0.12),
        now
      );
      transientGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      const waveShaperNode = context.createWaveShaper();
      waveShaperNode.curve = WAVE_SHAPER_CURVE as Float32Array<ArrayBuffer>;
      waveShaperNode.oversample = '2x';

      const compressor: DynamicsCompressorNode = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain: ReverbChain = ensureReverbChain(context, reverbChainRef, compressor);
      const reverbSendGainNode = context.createGain();
      reverbSendGainNode.gain.setValueAtTime(
        resolveReverbSendGain({ brightness, velocity }),
        now
      );

      oscillator.type = note.waveform ?? 'triangle';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + attackSeconds);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainUntil + releaseSeconds);

      oscillator.connect(gainNode);
      oscillator2.connect(blendGainNode);
      blendGainNode.connect(gainNode);
      transientOscillator.connect(transientGainNode);
      transientGainNode.connect(filterNode);
      gainNode.connect(waveShaperNode);
      waveShaperNode.connect(filterNode);
      filterNode.connect(compressor);
      filterNode.connect(reverbSendGainNode);
      reverbSendGainNode.connect(reverbChain.convolver);

      const activeNode = {
        blendGainNode,
        context,
        filterNode,
        gainNode,
        oscillator,
        oscillator2,
        reverbSendGainNode,
        transientGainNode,
        transientOscillator,
        waveShaperNode,
      };
      activeNodesRef.current.push(activeNode);
      trimTransientPolyphony(activeNodesRef);

      oscillator.onended = (): void => {
        activeNodesRef.current = activeNodesRef.current.filter((candidate) => candidate !== activeNode);
        try {
          oscillator2.stop();
          transientOscillator.stop();
        } catch { /* ignore */ }
        try {
          oscillator.disconnect();
          oscillator2.disconnect();
          blendGainNode.disconnect();
          gainNode.disconnect();
          reverbSendGainNode.disconnect();
          waveShaperNode.disconnect();
          filterNode.disconnect();
          transientOscillator.disconnect();
          transientGainNode.disconnect();
        } catch { /* ignore */ }
      };

      oscillator.start(now);
      oscillator2.start(now);
      transientOscillator.start(now);
      transientOscillator.stop(now + 0.045);
      oscillator.stop(now + durationSeconds);

      return true;
    },
    [clearActivePlayback, compressorNodeRef, ensureAudioContext, reverbChainRef, activeNodesRef]
  );

  return { playTone };
}
