import type { AudioWaveform } from '@/shared/contracts/ai-paths-core/base';
import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import type { NodeHandler, NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { coerceInput } from '../../utils';
import { isObjectRecord } from '@/shared/utils/object-utils';

type OscillatorSignal = {
  kind: 'oscillator';
  waveform: AudioWaveform;
  frequencyHz: number;
  gain: number;
  durationMs: number;
};

type ActivePlayback = {
  oscillator: OscillatorNode;
  gainNode: GainNode;
};

type AudioPlaybackState = {
  context: AudioContext | null;
  activeByNode: Map<string, ActivePlayback>;
};

const AUDIO_STATE_KEY = '__AI_PATHS_AUDIO_PLAYBACK_STATE__';

const DEFAULT_OSCILLATOR_SIGNAL: OscillatorSignal = {
  kind: 'oscillator',
  waveform: 'sine',
  frequencyHz: 440,
  gain: 0.25,
  durationMs: 400,
};

const WAVES: AudioWaveform[] = ['sine', 'square', 'triangle', 'sawtooth'];

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeWaveform = (value: unknown, fallback: AudioWaveform = 'sine'): AudioWaveform => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (WAVES.includes(normalized as AudioWaveform)) {
    return normalized as AudioWaveform;
  }
  return fallback;
};

const buildOscillatorSignal = (
  raw: Partial<OscillatorSignal> | null | undefined,
  fallback: OscillatorSignal = DEFAULT_OSCILLATOR_SIGNAL
): OscillatorSignal => {
  const waveform = normalizeWaveform(raw?.waveform, fallback.waveform);
  const frequencyHz = clampNumber(
    toFiniteNumber(raw?.frequencyHz, fallback.frequencyHz),
    20,
    20_000
  );
  const gain = clampNumber(toFiniteNumber(raw?.gain, fallback.gain), 0, 1);
  const durationMs = clampNumber(toFiniteNumber(raw?.durationMs, fallback.durationMs), 30, 10_000);
  return {
    kind: 'oscillator',
    waveform,
    frequencyHz,
    gain,
    durationMs,
  };
};

const parseOscillatorSignal = (value: unknown): OscillatorSignal | null => {
  if (!isObjectRecord(value)) return null;
  const maybeKind = value['kind'];
  if (typeof maybeKind === 'string' && maybeKind !== 'oscillator') return null;
  return buildOscillatorSignal({
    waveform: normalizeWaveform(value['waveform']),
    frequencyHz: toFiniteNumber(value['frequencyHz'], DEFAULT_OSCILLATOR_SIGNAL.frequencyHz),
    gain: toFiniteNumber(value['gain'], DEFAULT_OSCILLATOR_SIGNAL.gain),
    durationMs: toFiniteNumber(value['durationMs'], DEFAULT_OSCILLATOR_SIGNAL.durationMs),
  });
};

type GlobalAudioConstructors = {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const resolveGlobalAudioConstructors = (): GlobalAudioConstructors => {
  const root = globalThis as Record<string, unknown>;
  const audioContext = root['AudioContext'];
  const webkitAudioContext = root['webkitAudioContext'];
  return {
    ...(typeof audioContext === 'function'
      ? { AudioContext: audioContext as typeof AudioContext }
      : {}),
    ...(typeof webkitAudioContext === 'function'
      ? { webkitAudioContext: webkitAudioContext as typeof AudioContext }
      : {}),
  };
};

const isAudioPlaybackState = (value: unknown): value is AudioPlaybackState =>
  isObjectRecord(value) && value['activeByNode'] instanceof Map;

const hasWebAudio = (): boolean => {
  if (typeof globalThis === 'undefined') return false;
  const candidate = resolveGlobalAudioConstructors();
  return (
    typeof candidate.AudioContext === 'function' ||
    typeof candidate.webkitAudioContext === 'function'
  );
};

const getAudioState = (): AudioPlaybackState => {
  const root = globalThis as Record<string, unknown>;
  const current = root[AUDIO_STATE_KEY];
  if (isAudioPlaybackState(current)) return current;
  const created: AudioPlaybackState = {
    context: null,
    activeByNode: new Map<string, ActivePlayback>(),
  };
  root[AUDIO_STATE_KEY] = created;
  return created;
};

const resolveAudioContext = async (): Promise<AudioContext | null> => {
  if (!hasWebAudio()) return null;
  const state = getAudioState();
  const globalAudio = resolveGlobalAudioConstructors();
  const Ctor = globalAudio.AudioContext ?? globalAudio.webkitAudioContext;
  if (!Ctor) return null;
  if (!state.context || state.context.state === 'closed') {
    state.context = new Ctor();
  }
  if (state.context.state === 'suspended') {
    try {
      await state.context.resume();
    } catch {
      // Ignore; caller decides fallback status.
    }
  }
  return state.context;
};

const stopActivePlayback = (nodeId: string): void => {
  const state = getAudioState();
  const active = state.activeByNode.get(nodeId);
  if (!active) return;
  try {
    active.oscillator.stop();
  } catch {
    // Oscillator might already be stopped.
  }
  try {
    active.oscillator.disconnect();
    active.gainNode.disconnect();
  } catch {
    // Ignore disconnect errors on closed context.
  }
  state.activeByNode.delete(nodeId);
};

const playSignalOnMonoSpeaker = async (
  nodeId: string,
  signal: OscillatorSignal,
  speakerGain: number,
  stopPrevious: boolean
): Promise<'playing' | 'blocked' | 'unsupported'> => {
  const context = await resolveAudioContext();
  if (!context) return 'unsupported';
  if (context.state !== 'running') {
    return 'blocked';
  }
  const state = getAudioState();
  if (stopPrevious) {
    stopActivePlayback(nodeId);
  }
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime;
  const effectiveGain = clampNumber(signal.gain * speakerGain, 0, 1);

  oscillator.type = signal.waveform;
  oscillator.frequency.setValueAtTime(signal.frequencyHz, now);
  gainNode.gain.setValueAtTime(effectiveGain, now);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.onended = (): void => {
    const current = state.activeByNode.get(nodeId);
    if (current?.oscillator !== oscillator) return;
    state.activeByNode.delete(nodeId);
    try {
      oscillator.disconnect();
      gainNode.disconnect();
    } catch {
      // Ignore teardown errors.
    }
  };

  state.activeByNode.set(nodeId, { oscillator, gainNode });
  oscillator.start(now);
  oscillator.stop(now + signal.durationMs / 1000);
  return 'playing';
};

export const handleAudioOscillator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const configRaw = node.config?.['audioOscillator'];
  const config = buildOscillatorSignal(isObjectRecord(configRaw) ? configRaw : undefined);
  const triggerValue = coerceInput(nodeInputs['trigger']);
  const armed = triggerValue === undefined ? true : Boolean(triggerValue);

  const signal = buildOscillatorSignal({
    waveform: normalizeWaveform(coerceInput(nodeInputs['waveform']), config.waveform),
    frequencyHz: toFiniteNumber(coerceInput(nodeInputs['frequency']), config.frequencyHz),
    gain: toFiniteNumber(coerceInput(nodeInputs['gain']), config.gain),
    durationMs: toFiniteNumber(coerceInput(nodeInputs['durationMs']), config.durationMs),
  });

  if (!armed) {
    return {
      status: 'idle',
      frequency: signal.frequencyHz,
      waveform: signal.waveform,
      gain: signal.gain,
      durationMs: signal.durationMs,
    };
  }

  return {
    audioSignal: signal,
    frequency: signal.frequencyHz,
    waveform: signal.waveform,
    gain: signal.gain,
    durationMs: signal.durationMs,
    status: 'ready',
  };
};

export const handleAudioSpeaker: NodeHandler = async ({
  node,
  nodeInputs,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const configRaw = node.config?.['audioSpeaker'];
  const config = (
    isObjectRecord(configRaw)
      ? configRaw
      : {
          enabled: true,
          autoPlay: true,
          gain: 1,
          stopPrevious: true,
        }
  ) as Record<string, unknown>;

  if (config['enabled'] === false) {
    stopActivePlayback(node.id);
    return { status: 'disabled' };
  }

  const triggerValue = coerceInput(nodeInputs['trigger']);
  const armed = triggerValue === undefined ? true : Boolean(triggerValue);
  if (!armed) {
    return { status: 'armed' };
  }

  const providedSignal = parseOscillatorSignal(coerceInput(nodeInputs['audioSignal']));
  const fallbackSignal = buildOscillatorSignal({
    waveform: normalizeWaveform(coerceInput(nodeInputs['waveform'])),
    frequencyHz: toFiniteNumber(
      coerceInput(nodeInputs['frequency']),
      DEFAULT_OSCILLATOR_SIGNAL.frequencyHz
    ),
    gain: toFiniteNumber(coerceInput(nodeInputs['gain']), DEFAULT_OSCILLATOR_SIGNAL.gain),
    durationMs: toFiniteNumber(
      coerceInput(nodeInputs['durationMs']),
      DEFAULT_OSCILLATOR_SIGNAL.durationMs
    ),
  });
  const hasExplicitSignal =
    providedSignal !== null ||
    nodeInputs['frequency'] !== undefined ||
    nodeInputs['waveform'] !== undefined ||
    nodeInputs['gain'] !== undefined ||
    nodeInputs['durationMs'] !== undefined;
  if (!hasExplicitSignal) {
    return { status: 'idle' };
  }
  const signal = providedSignal ?? fallbackSignal;
  const speakerGain = clampNumber(toFiniteNumber(config['gain'], 1), 0, 1);

  if (config['autoPlay'] === false) {
    return {
      status: 'ready',
      audioSignal: signal,
      frequency: signal.frequencyHz,
      waveform: signal.waveform,
    };
  }

  const playbackStatus = await playSignalOnMonoSpeaker(
    node.id,
    signal,
    speakerGain,
    Boolean(config['stopPrevious'] ?? true)
  );

  const statusLabel =
    playbackStatus === 'playing'
      ? 'playing'
      : playbackStatus === 'blocked'
        ? 'blocked_by_browser'
        : 'unsupported_environment';

  return {
    status: statusLabel,
    audioSignal: signal,
    frequency: signal.frequencyHz,
    waveform: signal.waveform,
    gain: signal.gain,
    durationMs: signal.durationMs,
  };
};
