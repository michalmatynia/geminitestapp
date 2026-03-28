'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KangurMusicSynthOsc2Config } from './music-theory';
import { ensureCompressorNode, ensureReverbChain } from './useKangurMusicSynth.audio';
import { ActiveNode, DEFAULT_DURATION_MS, DEFAULT_GAIN, DEFAULT_GAP_MS, DEFAULT_VELOCITY, KangurMusicPlayableNote, KangurMusicSequenceCallbacks, KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE, ReverbChain, StopSustainedNoteOptions, SustainedNode } from './useKangurMusicSynth.types';
import {
  clamp,
  normalizeKangurMusicSynthEnvelope,
  releaseActiveNode,
  resolveAudioContextCtor,
  resolveBrightness,
  resolveConfiguredAttackSeconds,
  resolveConfiguredDecaySeconds,
  resolveConfiguredReleaseSeconds,
  resolveLfoRateHz,
  resolvePianoFilterProfile,
  resolvePortamentoSeconds,
  resolveReverbSendGain,
  resolveReverbStereoPan,
  resolveStereoPan,
  resolveSustainGain,
  resolveSustainedAttackPanSeconds,
  resolveSustainedAttackReverbSendGain,
  resolveSustainedAttackReverbSendSeconds,
  resolveSustainedAttackSeconds,
  resolveSustainedAttackStereoPan,
  resolveSustainedFilterAttackHz,
  resolveSustainedFilterAttackQ,
  resolveSustainedFilterHz,
  resolveSustainedFilterQ,
  resolveSustainedFilterSettleSeconds,
  resolveSustainedGainUpdateSeconds,
  resolveSustainedPanUpdateSeconds,
  resolveSustainedPeakGain,
  resolveSustainedReleaseSeconds,
  resolveSustainedTimbreUpdateSeconds,
  resolveSustainedTransientDurationSeconds,
  resolveSustainedTransientFrequencyHz,
  resolveSustainedTransientGain,
  resolveSustainedTransientWaveform,
  resolveSustainedUnisonAttackBlendGains,
  resolveSustainedUnisonAttackDetune,
  resolveSustainedUnisonBlendAttackSeconds,
  resolveSustainedUnisonBlendGains,
  resolveSustainedUnisonDetune,
  resolveSustainedVibratoFadeInSeconds,
  resolveSustainedVibratoReverbSendGain,
  resolveSustainedVibratoUpdateSeconds,
  resolveVelocityEnvelope,
  resolveVibratoDepthHz,
  resolveVibratoFilterDepthHz,
  resolveVibratoFilterQDepth,
  stopActiveNode,
  trimSustainedPolyphony,
  trimTransientPolyphony,
  WAVE_SHAPER_CURVE,
} from './useKangurMusicSynth.utils';

export function useKangurMusicSynth<NoteId extends string>() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const reverbChainRef = useRef<ReverbChain | null>(null);
  const activeNodesRef = useRef<ActiveNode[]>([]);
  const sustainedNodesRef = useRef<Map<string, SustainedNode<NoteId>>>(new Map());
  const playbackTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const isAudioSupported = useMemo(() => resolveAudioContextCtor() !== null, []);

  const clearScheduledTimeouts = useCallback((): void => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current = [];
  }, []);

  const clearActivePlayback = useCallback((): void => {
    clearScheduledTimeouts();
    activeNodesRef.current.forEach(stopActiveNode);
    activeNodesRef.current = [];
  }, [clearScheduledTimeouts]);

  const stopSustainedNote = useCallback(
    (interactionId: string, options: StopSustainedNoteOptions = {}): void => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return;
      }

      sustainedNodesRef.current.delete(interactionId);
      if (options.immediate) {
        stopActiveNode(activeNode);
        return;
      }

      const resolvedReleaseSeconds =
        options.releaseSeconds ??
        (activeNode.envelope
          ? resolveConfiguredReleaseSeconds(activeNode.envelope.releaseMs)
          : resolveSustainedReleaseSeconds(
              options.brightness ?? activeNode.brightness,
              options.velocity ?? activeNode.velocity,
              activeNode.currentFrequencyHz
            ));
      releaseActiveNode(activeNode, resolvedReleaseSeconds);
    },
    []
  );

  const stopAllSustainedNotes = useCallback(
    (options: StopSustainedNoteOptions = {}): void => {
      const interactionIds = [...sustainedNodesRef.current.keys()];
      interactionIds.forEach((interactionId) => {
        stopSustainedNote(interactionId, options);
      });
    },
    [stopSustainedNote]
  );

  const stop = useCallback((): void => {
    playbackTokenRef.current += 1;
    clearActivePlayback();
    stopAllSustainedNotes({ immediate: true });
    setIsPlayingSequence(false);
  }, [clearActivePlayback, stopAllSustainedNotes]);

  const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) {
      setIsAudioBlocked(false);
      return null;
    }

    let context = audioContextRef.current;
    if (!context || context.state === 'closed') {
      context = new AudioContextCtor();
      audioContextRef.current = context;
      compressorNodeRef.current = null;
      reverbChainRef.current = null;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // The browser may still require another gesture.
      }
    }

    if (context.state !== 'running') {
      setIsAudioBlocked(true);
      return null;
    }

    setIsAudioBlocked(false);
    return context;
  }, []);

  const playTone = useCallback(
    async (
      note: KangurMusicPlayableNote<NoteId>,
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
      waveShaperNode.curve = WAVE_SHAPER_CURVE;
      waveShaperNode.oversample = '2x';

      const compressor = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain = ensureReverbChain(context, reverbChainRef, compressor);
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
    [clearActivePlayback, ensureAudioContext]
  );

  const waitForPlaybackWindow = useCallback(
    (token: number, ms: number): Promise<boolean> =>
      new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          timeoutIdsRef.current = timeoutIdsRef.current.filter((candidate) => candidate !== timeoutId);
          resolve(playbackTokenRef.current === token);
        }, ms);
        timeoutIdsRef.current.push(timeoutId);
      }),
    []
  );

  const playNote = useCallback(
    async (note: KangurMusicPlayableNote<NoteId>): Promise<boolean> => {
      playbackTokenRef.current += 1;
      setIsPlayingSequence(false);
      return playTone(note, { stopPrevious: false });
    },
    [playTone]
  );

  const playSequence = useCallback(
    async (
      notes: readonly KangurMusicPlayableNote<NoteId>[],
      callbacks: KangurMusicSequenceCallbacks<NoteId> = {}
    ): Promise<boolean> => {
      const nextToken = playbackTokenRef.current + 1;
      playbackTokenRef.current = nextToken;
      clearActivePlayback();

      if (notes.length === 0) {
        callbacks.onComplete?.(true);
        return true;
      }

      setIsPlayingSequence(true);

      for (let index = 0; index < notes.length; index += 1) {
        if (playbackTokenRef.current !== nextToken) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }

        const note = notes[index];
        if (!note) {
          continue;
        }

        callbacks.onStepStart?.(note, index);
        const started = await playTone(note);
        if (!started) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }

        const keepGoing = await waitForPlaybackWindow(
          nextToken,
          Math.max(120, Math.round(note.durationMs ?? DEFAULT_DURATION_MS)) +
            Math.max(0, Math.round(callbacks.gapMs ?? DEFAULT_GAP_MS))
        );
        if (!keepGoing) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }
      }

      setIsPlayingSequence(false);
      callbacks.onComplete?.(true);
      return true;
    },
    [clearActivePlayback, playTone, waitForPlaybackWindow]
  );

  const startSustainedNote = useCallback(
    async (
      note: KangurMusicPlayableNote<NoteId>,
      options: {
        interactionId: string;
        osc1Volume?: number | undefined;
        osc2Config?: KangurMusicSynthOsc2Config | undefined;
      }
    ): Promise<boolean> => {
      playbackTokenRef.current += 1;
      clearActivePlayback();
      setIsPlayingSequence(false);

      const context = await ensureAudioContext();
      if (!context) {
        return false;
      }

      stopSustainedNote(options.interactionId, { immediate: true });

      const osc2Config = options.osc2Config;
      const osc2Enabled = osc2Config?.enabled !== false;

      const oscillator = context.createOscillator();
      const oscillator2 = osc2Enabled ? context.createOscillator() : undefined;
      const blendGainNode = osc2Enabled ? context.createGain() : undefined;
      const gainNode = context.createGain();
      const now = context.currentTime;
      const velocity = clamp(note.velocity ?? DEFAULT_VELOCITY, 0.22, 1);
      const brightness = resolveBrightness(note.brightness, velocity);
      const stereoPan = resolveStereoPan(note.stereoPan);
      const vibratoDepth = clamp(note.vibratoDepth ?? 0, 0, 1);
      const vibratoRateHz = resolveLfoRateHz(note.vibratoRateHz);
      const envelope = note.envelope
        ? normalizeKangurMusicSynthEnvelope(note.envelope)
        : undefined;
      const legacyVelocityEnvelope = resolveVelocityEnvelope({
        durationSeconds: 1,
        velocity,
      });
      const attackSeconds = envelope
        ? resolveConfiguredAttackSeconds(envelope.attackMs, velocity)
        : legacyVelocityEnvelope.attackSeconds;
      const decaySeconds = envelope ? resolveConfiguredDecaySeconds(envelope.decayMs) : 0;
      const sustainedAttackSeconds = resolveSustainedAttackSeconds(attackSeconds, note.frequencyHz);
      const sustainedDecaySeconds = decaySeconds;
      const sustainedUnisonAttackSeconds = resolveSustainedUnisonBlendAttackSeconds(
        sustainedAttackSeconds,
        brightness,
        note.frequencyHz
      );
      const sustainedFilterSettleSeconds = resolveSustainedFilterSettleSeconds(note.frequencyHz);
      const sustainedVibratoFadeInSeconds = resolveSustainedVibratoFadeInSeconds(
        note.frequencyHz
      );
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = resolveSustainedPeakGain({ baseGain, velocity });
      const resolvedGainWithOsc1 = resolvedGain * clamp(options.osc1Volume ?? 1, 0, 1);
      const sustainedGain = resolveSustainGain(
        resolvedGainWithOsc1,
        envelope?.sustainLevel ?? 1
      );
      const unisonDetune = resolveSustainedUnisonDetune(brightness, velocity, note.frequencyHz);
      const unisonAttackDetune = resolveSustainedUnisonAttackDetune(
        brightness,
        velocity,
        note.frequencyHz
      );
      const unisonBlendGains = resolveSustainedUnisonBlendGains(brightness, note.frequencyHz);
      const unisonAttackBlendGains = resolveSustainedUnisonAttackBlendGains(
        brightness,
        note.frequencyHz
      );
      const resolvedUnisonDetune =
        osc2Config && osc2Config.detuneCents !== 0
          ? {
              lowerCents: -Math.abs(osc2Config.detuneCents),
              upperCents: Math.abs(osc2Config.detuneCents),
            }
          : unisonDetune;
      const resolvedUnisonAttackDetune =
        osc2Config && osc2Config.detuneCents !== 0 ? resolvedUnisonDetune : unisonAttackDetune;
      const osc2BlendMultiplier = osc2Config ? clamp(osc2Config.blend / 0.3, 0, 3.33) : 1;

      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(
        resolveSustainedFilterAttackHz(brightness, velocity, note.frequencyHz),
        now
      );
      filterNode.frequency.linearRampToValueAtTime(
        resolveSustainedFilterHz(brightness, velocity, note.frequencyHz),
        now + sustainedAttackSeconds + sustainedFilterSettleSeconds
      );
      filterNode.Q.setValueAtTime(
        resolveSustainedFilterAttackQ(brightness, velocity, note.frequencyHz),
        now
      );
      filterNode.Q.linearRampToValueAtTime(
        resolveSustainedFilterQ(brightness, velocity, note.frequencyHz),
        now + sustainedAttackSeconds + sustainedFilterSettleSeconds
      );

      const lfoOscillator = context.createOscillator();
      const lfoGainNode = context.createGain();
      const lfoFilterGainNode = context.createGain();
      const lfoFilterQGainNode = context.createGain();
      lfoOscillator.type = 'sine';
      lfoOscillator.frequency.value = vibratoRateHz;
      lfoGainNode.gain.setValueAtTime(0, now);
      lfoGainNode.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(note.frequencyHz, vibratoDepth),
        now + sustainedAttackSeconds + sustainedVibratoFadeInSeconds
      );
      lfoFilterGainNode.gain.setValueAtTime(0, now);
      lfoFilterGainNode.gain.linearRampToValueAtTime(
        resolveVibratoFilterDepthHz(brightness, note.frequencyHz, vibratoDepth),
        now + sustainedAttackSeconds + sustainedVibratoFadeInSeconds
      );
      lfoFilterQGainNode.gain.setValueAtTime(0, now);
      lfoFilterQGainNode.gain.linearRampToValueAtTime(
        resolveVibratoFilterQDepth(brightness, note.frequencyHz, vibratoDepth),
        now + sustainedAttackSeconds + sustainedVibratoFadeInSeconds
      );

      const oscillator3 = osc2Enabled ? context.createOscillator() : undefined;
      const blend3GainNode = osc2Enabled ? context.createGain() : undefined;
      if (oscillator3 && blend3GainNode) {
        oscillator3.type = osc2Config?.waveform ?? note.waveform ?? 'sawtooth';
        oscillator3.frequency.setValueAtTime(note.frequencyHz, now);
        oscillator3.detune.setValueAtTime(resolvedUnisonAttackDetune.upperCents, now);
        oscillator3.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.upperCents,
          now + sustainedUnisonAttackSeconds
        );
        blend3GainNode.gain.setValueAtTime(unisonAttackBlendGains.upperGain * osc2BlendMultiplier, now);
        blend3GainNode.gain.linearRampToValueAtTime(
          unisonBlendGains.upperGain * osc2BlendMultiplier,
          now + sustainedUnisonAttackSeconds
        );
      }

      const transientOscillator = context.createOscillator();
      const transientGainNode = context.createGain();
      const transientDurationSeconds = resolveSustainedTransientDurationSeconds(
        brightness,
        note.frequencyHz
      );
      transientOscillator.type = resolveSustainedTransientWaveform(
        note.waveform,
        brightness,
        note.frequencyHz
      );
      transientOscillator.frequency.setValueAtTime(
        resolveSustainedTransientFrequencyHz(note.frequencyHz),
        now
      );
      transientGainNode.gain.setValueAtTime(
        resolveSustainedTransientGain({
          brightness,
          frequencyHz: note.frequencyHz,
          resolvedGain,
          velocity,
        }),
        now
      );
      transientGainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + transientDurationSeconds
      );

      const compressor = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain = ensureReverbChain(context, reverbChainRef, compressor);
      const reverbSendGainNode = context.createGain();
      const stereoPannerNode =
        typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      const reverbStereoPannerNode =
        typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      
      const sustainedVibratoReverbSendGain = resolveSustainedVibratoReverbSendGain({
        brightness,
        frequencyHz: note.frequencyHz,
        velocity,
        vibratoDepth,
      });
      reverbSendGainNode.gain.setValueAtTime(
        resolveSustainedAttackReverbSendGain(
          brightness,
          velocity,
          note.frequencyHz,
          vibratoDepth
        ),
        now
      );
      const sustainedAttackReverbSendSeconds = resolveSustainedAttackReverbSendSeconds(
        sustainedUnisonAttackSeconds,
        brightness,
        note.frequencyHz,
        stereoPan
      );
      reverbSendGainNode.gain.linearRampToValueAtTime(
        sustainedVibratoReverbSendGain,
        now + sustainedAttackReverbSendSeconds
      );
      const sustainedAttackStereoPan = resolveSustainedAttackStereoPan(
        stereoPan,
        note.frequencyHz
      );
      const sustainedAttackDryPanSeconds = resolveSustainedAttackPanSeconds(
        sustainedUnisonAttackSeconds,
        note.frequencyHz,
        stereoPan
      );
      const sustainedAttackWetPanSeconds = resolveSustainedAttackPanSeconds(
        sustainedUnisonAttackSeconds,
        note.frequencyHz,
        stereoPan,
        true
      );
      stereoPannerNode?.pan.setValueAtTime(sustainedAttackStereoPan, now);
      stereoPannerNode?.pan.linearRampToValueAtTime(
        stereoPan,
        now + sustainedAttackDryPanSeconds
      );
      reverbStereoPannerNode?.pan.setValueAtTime(
        resolveReverbStereoPan(sustainedAttackStereoPan),
        now
      );
      reverbStereoPannerNode?.pan.linearRampToValueAtTime(
        resolveReverbStereoPan(stereoPan),
        now + sustainedAttackWetPanSeconds
      );

      oscillator.type = note.waveform ?? 'sawtooth';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);
      if (oscillator2 && blendGainNode) {
        oscillator2.type = osc2Config?.waveform ?? (note.waveform === 'square' ? 'triangle' : 'sine');
        oscillator2.frequency.setValueAtTime(note.frequencyHz, now);
        oscillator2.detune.setValueAtTime(resolvedUnisonAttackDetune.lowerCents, now);
        oscillator2.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.lowerCents,
          now + sustainedUnisonAttackSeconds
        );
        blendGainNode.gain.setValueAtTime(unisonAttackBlendGains.lowerGain * osc2BlendMultiplier, now);
        blendGainNode.gain.linearRampToValueAtTime(
          unisonBlendGains.lowerGain * osc2BlendMultiplier,
          now + sustainedUnisonAttackSeconds
        );
      }

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGainWithOsc1, now + sustainedAttackSeconds);
      gainNode.gain.linearRampToValueAtTime(
        sustainedGain,
        now + sustainedAttackSeconds + sustainedDecaySeconds
      );

      lfoOscillator.connect(lfoGainNode);
      lfoGainNode.connect(oscillator.frequency);
      if (oscillator2) lfoGainNode.connect(oscillator2.frequency);
      if (oscillator3) lfoGainNode.connect(oscillator3.frequency);
      lfoOscillator.connect(lfoFilterGainNode);
      lfoFilterGainNode.connect(filterNode.frequency);
      lfoOscillator.connect(lfoFilterQGainNode);
      lfoFilterQGainNode.connect(filterNode.Q);
      oscillator.connect(gainNode);
      if (oscillator2 && blendGainNode) {
        oscillator2.connect(blendGainNode);
        blendGainNode.connect(gainNode);
      }
      if (oscillator3 && blend3GainNode) {
        oscillator3.connect(blend3GainNode);
        blend3GainNode.connect(gainNode);
      }
      transientOscillator.connect(transientGainNode);
      transientGainNode.connect(filterNode);
      gainNode.connect(filterNode);
      if (stereoPannerNode) {
        filterNode.connect(stereoPannerNode);
        stereoPannerNode.connect(compressor);
      } else {
        filterNode.connect(compressor);
      }
      filterNode.connect(reverbSendGainNode);
      if (reverbStereoPannerNode) {
        reverbSendGainNode.connect(reverbStereoPannerNode);
        reverbStereoPannerNode.connect(reverbChain.convolver);
      } else {
        reverbSendGainNode.connect(reverbChain.convolver);
      }

      const sustainedNode: SustainedNode<NoteId> = {
        baseGain,
        blendGainNode,
        blendGainNode3: blend3GainNode,
        brightness,
        context,
        currentFrequencyHz: note.frequencyHz,
        envelope,
        filterNode,
        gainNode,
        id: note.id,
        interactionId: options.interactionId,
        lfoFilterGainNode,
        lfoFilterQGainNode,
        lfoGainNode,
        lfoOscillator,
        oscillator,
        oscillator2,
        oscillator3,
        reverbSendGainNode,
        reverbStereoPannerNode: reverbStereoPannerNode ?? undefined,
        stereoPan,
        stereoPannerNode: stereoPannerNode ?? undefined,
        transientGainNode,
        transientOscillator,
        velocity,
        vibratoDepth,
        vibratoRateHz,
      };
      sustainedNodesRef.current.set(options.interactionId, sustainedNode);
      trimSustainedPolyphony(sustainedNodesRef);

      oscillator.onended = (): void => {
        const activeNode = sustainedNodesRef.current.get(options.interactionId);
        if (activeNode === sustainedNode) {
          sustainedNodesRef.current.delete(options.interactionId);
        }
        try {
          lfoOscillator.stop();
          oscillator2?.stop();
          oscillator3?.stop();
          transientOscillator.stop();
          lfoOscillator.disconnect();
          lfoFilterGainNode.disconnect();
          lfoFilterQGainNode.disconnect();
          lfoGainNode.disconnect();
          oscillator.disconnect();
          oscillator2?.disconnect();
          blendGainNode?.disconnect();
          oscillator3?.disconnect();
          blend3GainNode?.disconnect();
          transientOscillator.disconnect();
          transientGainNode.disconnect();
          gainNode.disconnect();
          reverbSendGainNode.disconnect();
          reverbStereoPannerNode?.disconnect();
          stereoPannerNode?.disconnect();
          filterNode.disconnect();
        } catch { /* ignore */ }
      };

      oscillator.start(now);
      oscillator2?.start(now);
      oscillator3?.start(now);
      transientOscillator.start(now);
      transientOscillator.stop(now + transientDurationSeconds + 0.005);
      lfoOscillator.start(now);
      return true;
    },
    [clearActivePlayback, ensureAudioContext, stopSustainedNote]
  );

  const updateSustainedNote = useCallback(
    ({
      brightness,
      frequencyHz,
      interactionId,
      stereoPan,
      velocity,
      vibratoDepth,
      vibratoRateHz,
    }: {
      brightness?: number;
      frequencyHz: number;
      interactionId: string;
      stereoPan?: number;
      velocity?: number;
      vibratoDepth?: number;
      vibratoRateHz?: number;
    }): boolean => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return false;
      }

      const now = activeNode.context.currentTime;
      const portamentoSeconds = resolvePortamentoSeconds(
        activeNode.currentFrequencyHz,
        frequencyHz
      );
      activeNode.oscillator.frequency.cancelScheduledValues(now);
      activeNode.oscillator.frequency.setValueAtTime(activeNode.oscillator.frequency.value, now);
      activeNode.oscillator.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.oscillator2?.frequency.cancelScheduledValues(now);
      activeNode.oscillator2?.frequency.setValueAtTime(
        activeNode.oscillator2.frequency.value,
        now
      );
      activeNode.oscillator2?.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.oscillator3?.frequency.cancelScheduledValues(now);
      activeNode.oscillator3?.frequency.setValueAtTime(
        activeNode.oscillator3.frequency.value,
        now
      );
      activeNode.oscillator3?.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.currentFrequencyHz = frequencyHz;
      const vibratoUpdateSeconds = resolveSustainedVibratoUpdateSeconds(frequencyHz);
      const dryPanUpdateSeconds = resolveSustainedPanUpdateSeconds(frequencyHz);
      const wetPanUpdateSeconds = resolveSustainedPanUpdateSeconds(frequencyHz, true);
      const gainUpdateSeconds = resolveSustainedGainUpdateSeconds(frequencyHz);
      const timbreUpdateSeconds = resolveSustainedTimbreUpdateSeconds(
        portamentoSeconds,
        frequencyHz
      );
      const resolvedVibratoDepth = clamp(vibratoDepth ?? activeNode.vibratoDepth, 0, 1);
      activeNode.vibratoDepth = resolvedVibratoDepth;
      const resolvedVibratoRateHz = resolveLfoRateHz(vibratoRateHz ?? activeNode.vibratoRateHz);
      activeNode.vibratoRateHz = resolvedVibratoRateHz;
      const resolvedStereoPan = resolveStereoPan(stereoPan ?? activeNode.stereoPan);
      activeNode.stereoPan = resolvedStereoPan;
      const resolvedVelocityForTimbre =
        velocity !== undefined ? clamp(velocity, 0.22, 1) : activeNode.velocity;
      const resolvedBrightnessForTimbre =
        brightness !== undefined
          ? resolveBrightness(brightness, resolvedVelocityForTimbre)
          : activeNode.brightness;
      const filterVibratoUpdateSeconds = Math.max(vibratoUpdateSeconds, timbreUpdateSeconds);
      activeNode.lfoOscillator?.frequency.cancelScheduledValues(now);
      activeNode.lfoOscillator?.frequency.setValueAtTime(
        activeNode.lfoOscillator.frequency.value,
        now
      );
      activeNode.lfoOscillator?.frequency.linearRampToValueAtTime(
        resolvedVibratoRateHz,
        now + vibratoUpdateSeconds
      );
      activeNode.lfoGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoGainNode?.gain.setValueAtTime(activeNode.lfoGainNode.gain.value, now);
      activeNode.lfoGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(frequencyHz, resolvedVibratoDepth),
        now + vibratoUpdateSeconds
      );
      activeNode.lfoFilterGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoFilterGainNode?.gain.setValueAtTime(
        activeNode.lfoFilterGainNode.gain.value,
        now
      );
      activeNode.lfoFilterGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoFilterDepthHz(
          resolvedBrightnessForTimbre,
          frequencyHz,
          resolvedVibratoDepth
        ),
        now + filterVibratoUpdateSeconds
      );
      activeNode.lfoFilterQGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoFilterQGainNode?.gain.setValueAtTime(
        activeNode.lfoFilterQGainNode.gain.value,
        now
      );
      activeNode.lfoFilterQGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoFilterQDepth(
          resolvedBrightnessForTimbre,
          frequencyHz,
          resolvedVibratoDepth
        ),
        now + filterVibratoUpdateSeconds
      );
      activeNode.stereoPannerNode?.pan.cancelScheduledValues(now);
      activeNode.stereoPannerNode?.pan.setValueAtTime(
        activeNode.stereoPannerNode.pan.value,
        now
      );
      activeNode.stereoPannerNode?.pan.linearRampToValueAtTime(
        resolvedStereoPan,
        now + dryPanUpdateSeconds
      );
      activeNode.reverbStereoPannerNode?.pan.cancelScheduledValues(now);
      activeNode.reverbStereoPannerNode?.pan.setValueAtTime(
        activeNode.reverbStereoPannerNode.pan.value,
        now
      );
      activeNode.reverbStereoPannerNode?.pan.linearRampToValueAtTime(
        resolveReverbStereoPan(resolvedStereoPan),
        now + wetPanUpdateSeconds
      );
      const resolvedUnisonBlendGains = resolveSustainedUnisonBlendGains(
        resolvedBrightnessForTimbre,
        frequencyHz
      );
      const resolvedUnisonDetune = resolveSustainedUnisonDetune(
        resolvedBrightnessForTimbre,
        resolvedVelocityForTimbre,
        frequencyHz
      );
      activeNode.filterNode?.frequency.cancelScheduledValues(now);
      activeNode.filterNode?.frequency.setValueAtTime(activeNode.filterNode.frequency.value, now);
      activeNode.filterNode?.frequency.linearRampToValueAtTime(
        resolveSustainedFilterHz(
          resolvedBrightnessForTimbre,
          resolvedVelocityForTimbre,
          frequencyHz
        ),
        now + timbreUpdateSeconds
      );
      activeNode.filterNode?.Q.cancelScheduledValues(now);
      activeNode.filterNode?.Q.setValueAtTime(activeNode.filterNode.Q.value, now);
      activeNode.filterNode?.Q.linearRampToValueAtTime(
        resolveSustainedFilterQ(
          resolvedBrightnessForTimbre,
          resolvedVelocityForTimbre,
          frequencyHz
        ),
        now + timbreUpdateSeconds
      );
      activeNode.blendGainNode?.gain.cancelScheduledValues(now);
      activeNode.blendGainNode?.gain.setValueAtTime(activeNode.blendGainNode.gain.value, now);
      activeNode.blendGainNode?.gain.linearRampToValueAtTime(
        resolvedUnisonBlendGains.lowerGain,
        now + timbreUpdateSeconds
      );
      activeNode.blendGainNode3?.gain.cancelScheduledValues(now);
      activeNode.blendGainNode3?.gain.setValueAtTime(activeNode.blendGainNode3.gain.value, now);
      activeNode.blendGainNode3?.gain.linearRampToValueAtTime(
        resolvedUnisonBlendGains.upperGain,
        now + timbreUpdateSeconds
      );
      if (activeNode.oscillator2) {
        activeNode.oscillator2.detune.cancelScheduledValues(now);
        activeNode.oscillator2.detune.setValueAtTime(activeNode.oscillator2.detune.value, now);
        activeNode.oscillator2.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.lowerCents,
          now + timbreUpdateSeconds
        );
      }
      if (activeNode.oscillator3) {
        activeNode.oscillator3.detune.cancelScheduledValues(now);
        activeNode.oscillator3.detune.setValueAtTime(activeNode.oscillator3.detune.value, now);
        activeNode.oscillator3.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.upperCents,
          now + timbreUpdateSeconds
        );
      }
      activeNode.reverbSendGainNode?.gain.cancelScheduledValues(now);
      activeNode.reverbSendGainNode?.gain.setValueAtTime(
        activeNode.reverbSendGainNode.gain.value,
        now
      );
      activeNode.reverbSendGainNode?.gain.linearRampToValueAtTime(
        resolveSustainedVibratoReverbSendGain({
          brightness: resolvedBrightnessForTimbre,
          frequencyHz,
          velocity: resolvedVelocityForTimbre,
          vibratoDepth: resolvedVibratoDepth,
        }),
        now + timbreUpdateSeconds
      );

      if (velocity !== undefined || brightness !== undefined) {
        const normalizedVelocity = clamp(velocity ?? DEFAULT_VELOCITY, 0.22, 1);
        const normalizedBrightness = resolveBrightness(brightness, normalizedVelocity);
        activeNode.velocity = normalizedVelocity;
        activeNode.brightness = normalizedBrightness;
        const resolvedGain = resolveSustainedPeakGain({
          baseGain: activeNode.baseGain,
          velocity: normalizedVelocity,
        });
        const resolvedSustainGain = activeNode.envelope
          ? resolveSustainGain(resolvedGain, activeNode.envelope.sustainLevel)
          : resolvedGain;
        activeNode.gainNode.gain.cancelScheduledValues(now);
        activeNode.gainNode.gain.setValueAtTime(activeNode.gainNode.gain.value, now);
        activeNode.gainNode.gain.linearRampToValueAtTime(
          resolvedSustainGain,
          now + gainUpdateSeconds
        );
      }

      return true;
    },
    []
  );

  useEffect(() => {
    return () => {
      stop();
      const context = audioContextRef.current;
      if (context && context.state !== 'closed') {
        void context.close().catch(() => undefined);
      }
      audioContextRef.current = null;
      compressorNodeRef.current = null;
      reverbChainRef.current = null;
    };
  }, [stop]);

  return {
    isAudioBlocked,
    isAudioSupported,
    isPlayingSequence,
    playNote,
    playSequence,
    startSustainedNote,
    stop,
    stopAllSustainedNotes,
    stopSustainedNote,
    updateSustainedNote,
  };
}

export type { KangurMusicPlayableNote, KangurMusicSequenceCallbacks };
export { KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE, normalizeKangurMusicSynthEnvelope };
export type { KangurMusicSynthEnvelope };
