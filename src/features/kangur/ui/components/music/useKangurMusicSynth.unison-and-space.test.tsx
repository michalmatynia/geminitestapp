/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as synthSupport from './useKangurMusicSynth.test-support';

const {
  createdContexts,
  findGainNodeByRampTarget,
  findPannerNodeByRampTarget,
  resolveExpectedSustainedAttackBlendGains,
  resolveExpectedSustainedAttackDetune,
  resolveExpectedSustainedAttackPanSeconds,
  resolveExpectedSustainedAttackReverbSendGain,
  resolveExpectedSustainedAttackReverbSendSeconds,
  resolveExpectedSustainedAttackStereoPan,
  resolveExpectedSustainedLowerBlendGain,
  resolveExpectedSustainedReverbPan,
  resolveExpectedSustainedReverbSendGain,
  resolveExpectedSustainedUnisonBlendAttackSeconds,
  resolveExpectedSustainedUpperBlendGain,
  resolveExpectedSustainedVibratoReverbSendGain,
} = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('starts sustained side-voice blend tighter for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const lowExpectedAttackBlendGains = resolveExpectedSustainedAttackBlendGains(
      brightness,
      lowFrequencyHz
    );
    const lowExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightness,
      lowFrequencyHz
    );
    const lowExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightness,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'blend-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-attack-low' }
      );
    });

    const lowLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainLowerBlend
    );
    const lowUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainUpperBlend
    );
    expect(lowLowerBlendGainNode).toBeDefined();
    expect(lowUpperBlendGainNode).toBeDefined();

    const lowLowerAttackBlend =
      lowLowerBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperAttackBlend =
      lowUpperBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowLowerBlendAttackTime =
      lowLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const lowExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      lowFrequencyHz
    );

    expect(lowLowerAttackBlend).toBe(lowExpectedAttackBlendGains.lowerGain);
    expect(lowUpperAttackBlend).toBe(lowExpectedAttackBlendGains.upperGain);
    expect(lowLowerAttackBlend).toBeLessThan(lowExpectedSustainLowerBlend);
    expect(lowUpperAttackBlend).toBeLessThan(lowExpectedSustainUpperBlend);
    expect(lowLowerBlendAttackTime).toBe(lowExpectedBlendAttackTime);

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackBlendGains = resolveExpectedSustainedAttackBlendGains(
      brightness,
      highFrequencyHz
    );
    const highExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightness,
      highFrequencyHz
    );
    const highExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightness,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'blend-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-attack-high' }
      );
    });

    const highLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainLowerBlend
    );
    const highUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainUpperBlend
    );
    expect(highLowerBlendGainNode).toBeDefined();
    expect(highUpperBlendGainNode).toBeDefined();

    const highLowerAttackBlend =
      highLowerBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperAttackBlend =
      highUpperBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highLowerBlendAttackTime =
      highLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const highExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      highFrequencyHz
    );

    expect(highLowerAttackBlend).toBe(highExpectedAttackBlendGains.lowerGain);
    expect(highUpperAttackBlend).toBe(highExpectedAttackBlendGains.upperGain);
    expect(highLowerAttackBlend).toBeLessThan(highExpectedSustainLowerBlend);
    expect(highUpperAttackBlend).toBeLessThan(highExpectedSustainUpperBlend);
    expect(highLowerBlendAttackTime).toBe(highExpectedBlendAttackTime);
    expect(lowLowerAttackBlend).toBeGreaterThan(highLowerAttackBlend);
    expect(lowUpperAttackBlend).toBeGreaterThan(highUpperAttackBlend);
    expect(lowLowerBlendAttackTime).toBeGreaterThan(highLowerBlendAttackTime);
  });

  it('starts sustained unison detune narrower for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const lowExpectedAttackDetune = resolveExpectedSustainedAttackDetune(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'detune-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-detune-attack-low' }
      );
    });

    const lowLowerOscillator = createdContexts.at(-1)?.oscillators[1];
    const lowUpperOscillator = createdContexts.at(-1)?.oscillators[3];
    expect(lowLowerOscillator).toBeDefined();
    expect(lowUpperOscillator).toBeDefined();

    const lowLowerAttackDetune =
      lowLowerOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperAttackDetune =
      lowUpperOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowLowerSustainDetune =
      lowLowerOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperSustainDetune =
      lowUpperOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowLowerAttackDetune).toBe(lowExpectedAttackDetune.lowerCents);
    expect(lowUpperAttackDetune).toBe(lowExpectedAttackDetune.upperCents);
    expect(Math.abs(lowLowerAttackDetune)).toBeLessThan(Math.abs(lowLowerSustainDetune));
    expect(Math.abs(lowUpperAttackDetune)).toBeLessThan(Math.abs(lowUpperSustainDetune));

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackDetune = resolveExpectedSustainedAttackDetune(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'detune-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-detune-attack-high' }
      );
    });

    const highLowerOscillator = createdContexts.at(-1)?.oscillators[1];
    const highUpperOscillator = createdContexts.at(-1)?.oscillators[3];
    expect(highLowerOscillator).toBeDefined();
    expect(highUpperOscillator).toBeDefined();

    const highLowerAttackDetune =
      highLowerOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperAttackDetune =
      highUpperOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highLowerSustainDetune =
      highLowerOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperSustainDetune =
      highUpperOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highLowerAttackDetune).toBe(highExpectedAttackDetune.lowerCents);
    expect(highUpperAttackDetune).toBe(highExpectedAttackDetune.upperCents);
    expect(Math.abs(highLowerAttackDetune)).toBeLessThan(Math.abs(highLowerSustainDetune));
    expect(Math.abs(highUpperAttackDetune)).toBeLessThan(Math.abs(highUpperSustainDetune));
    expect(Math.abs(lowLowerAttackDetune)).toBeGreaterThan(Math.abs(highLowerAttackDetune));
    expect(Math.abs(lowUpperAttackDetune)).toBeGreaterThan(Math.abs(highUpperAttackDetune));
  });

  it('blooms sustained side-voice blend faster for brighter synth starts at the same pitch', async () => {
    const velocity = 0.6;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const mellowBrightness = 0.24;
    const brightBrightness = 0.92;
    const mellowExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      mellowBrightness,
      frequencyHz
    );
    const mellowExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      mellowBrightness,
      frequencyHz
    );
    const mellowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await mellowHook.result.current.startSustainedNote(
        {
          brightness: mellowBrightness,
          frequencyHz,
          id: 'blend-bloom-mellow',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-bloom-mellow' }
      );
    });

    const mellowLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      mellowExpectedSustainLowerBlend
    );
    const mellowUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      mellowExpectedSustainUpperBlend
    );
    expect(mellowLowerBlendGainNode).toBeDefined();
    expect(mellowUpperBlendGainNode).toBeDefined();

    const mellowLowerBlendAttackTime =
      mellowLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const mellowUpperBlendAttackTime =
      mellowUpperBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const mellowExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      mellowBrightness,
      frequencyHz
    );

    expect(mellowLowerBlendAttackTime).toBe(mellowExpectedBlendAttackTime);
    expect(mellowUpperBlendAttackTime).toBe(mellowExpectedBlendAttackTime);

    mellowHook.unmount();
    const brightExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightBrightness,
      frequencyHz
    );
    const brightExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightBrightness,
      frequencyHz
    );
    const brightHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await brightHook.result.current.startSustainedNote(
        {
          brightness: brightBrightness,
          frequencyHz,
          id: 'blend-bloom-bright',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-bloom-bright' }
      );
    });

    const brightLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      brightExpectedSustainLowerBlend
    );
    const brightUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      brightExpectedSustainUpperBlend
    );
    expect(brightLowerBlendGainNode).toBeDefined();
    expect(brightUpperBlendGainNode).toBeDefined();

    const brightLowerBlendAttackTime =
      brightLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const brightUpperBlendAttackTime =
      brightUpperBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const brightExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightBrightness,
      frequencyHz
    );

    expect(brightLowerBlendAttackTime).toBe(brightExpectedBlendAttackTime);
    expect(brightUpperBlendAttackTime).toBe(brightExpectedBlendAttackTime);
    expect(mellowLowerBlendAttackTime).toBeGreaterThan(brightLowerBlendAttackTime);
    expect(mellowUpperBlendAttackTime).toBeGreaterThan(brightUpperBlendAttackTime);
  });

  it('starts sustained reverb send drier for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const lowExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowExpectedAttackSend = resolveExpectedSustainedAttackReverbSendGain(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'reverb-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-attack-low' }
      );
    });

    const lowReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainSend
    );
    expect(lowReverbSendGainNode).toBeDefined();
    const lowAttackSend = lowReverbSendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowSustainSend =
      lowReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowAttackSend).toBe(lowExpectedAttackSend);
    expect(lowAttackSend).toBeLessThan(lowSustainSend);

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highExpectedAttackSend = resolveExpectedSustainedAttackReverbSendGain(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'reverb-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-attack-high' }
      );
    });

    const highReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainSend
    );
    expect(highReverbSendGainNode).toBeDefined();
    const highAttackSend =
      highReverbSendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highSustainSend =
      highReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highAttackSend).toBe(highExpectedAttackSend);
    expect(highAttackSend).toBeLessThan(highSustainSend);
    expect(lowAttackSend).toBeGreaterThan(highAttackSend);
  });

  it('starts sustained stereo pan closer to center for higher synth notes', async () => {
    const stereoPan = 0.54;
    const lowFrequencyHz = 196;
    const lowExpectedAttackPan = resolveExpectedSustainedAttackStereoPan(
      stereoPan,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: lowFrequencyHz,
          id: 'pan-attack-low',
          stereoPan,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-attack-low' }
      );
    });

    const lowDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), stereoPan);
    expect(lowDryPanner).toBeDefined();
    const lowAttackPan = lowDryPanner?.pan.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowSustainPan = lowDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowAttackPan).toBe(lowExpectedAttackPan);
    expect(Math.abs(lowAttackPan)).toBeLessThan(Math.abs(lowSustainPan));

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackPan = resolveExpectedSustainedAttackStereoPan(
      stereoPan,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: highFrequencyHz,
          id: 'pan-attack-high',
          stereoPan,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-attack-high' }
      );
    });

    const highDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), stereoPan);
    expect(highDryPanner).toBeDefined();
    const highAttackPan = highDryPanner?.pan.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highSustainPan =
      highDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highAttackPan).toBe(highExpectedAttackPan);
    expect(Math.abs(highAttackPan)).toBeLessThan(Math.abs(highSustainPan));
    expect(Math.abs(lowAttackPan)).toBeGreaterThan(Math.abs(highAttackPan));
  });

  it('blooms sustained stereo pan a bit slower at wider placements', async () => {
    const frequencyHz = 261.63;
    const velocity = 0.72;
    const brightness = 0.79;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const centerStereoPan = 0.18;
    const centerExpectedAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      centerStereoPan
    );
    const centerHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await centerHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'pan-center',
          stereoPan: centerStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-center' }
      );
    });

    const centerDryPanner = findPannerNodeByRampTarget(
      createdContexts.at(-1),
      centerStereoPan
    );
    expect(centerDryPanner).toBeDefined();
    const centerAttackTime =
      centerDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(centerAttackTime).toBe(centerExpectedAttackTime);

    centerHook.unmount();
    const edgeStereoPan = 0.54;
    const edgeExpectedAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      edgeStereoPan
    );
    const edgeHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await edgeHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'pan-edge',
          stereoPan: edgeStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-edge' }
      );
    });

    const edgeDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), edgeStereoPan);
    expect(edgeDryPanner).toBeDefined();
    const edgeAttackTime =
      edgeDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(edgeAttackTime).toBe(edgeExpectedAttackTime);
    expect(edgeAttackTime).toBeGreaterThan(centerAttackTime);
  });

  it('blooms sustained reverb send a bit slower at wider placements', async () => {
    const brightness = 0.79;
    const velocity = 0.72;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const centerStereoPan = 0.18;
    const centerExpectedAttackTime = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      centerStereoPan
    );
    const centerExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const centerHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await centerHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-center',
          stereoPan: centerStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-center' }
      );
    });

    const centerReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      centerExpectedSustainSend
    );
    expect(centerReverbSendGainNode).toBeDefined();
    const centerAttackTime =
      centerReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(centerAttackTime).toBe(centerExpectedAttackTime);

    centerHook.unmount();
    const edgeStereoPan = 0.54;
    const edgeExpectedAttackTime = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      edgeStereoPan
    );
    const edgeExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const edgeHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await edgeHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-edge',
          stereoPan: edgeStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-edge' }
      );
    });

    const edgeReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      edgeExpectedSustainSend
    );
    expect(edgeReverbSendGainNode).toBeDefined();
    const edgeAttackTime =
      edgeReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(edgeAttackTime).toBe(edgeExpectedAttackTime);
    expect(edgeAttackTime).toBeGreaterThan(centerAttackTime);
  });

  it('lets the sustained reverb send bloom slightly after the dry body on note-on', async () => {
    const brightness = 0.79;
    const velocity = 0.72;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedBodyAttackSeconds = synthSupport.resolveExpectedSustainedAttackSeconds(
      baseAttackSeconds,
      frequencyHz
    );
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const expectedReverbSendAttackSeconds = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      0
    );
    const expectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-bloom',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-bloom' }
      );
    });

    const bodyGainNode = createdContexts[0]?.gains[1];
    const reverbSendGainNode = findGainNodeByRampTarget(createdContexts[0], expectedSustainSend);
    expect(bodyGainNode).toBeDefined();
    expect(reverbSendGainNode).toBeDefined();

    const bodyAttackTime = bodyGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const reverbSendAttackTime =
      reverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(bodyAttackTime).toBe(expectedBodyAttackSeconds);
    expect(reverbSendAttackTime).toBe(expectedReverbSendAttackSeconds);
    expect(reverbSendAttackTime).toBeGreaterThan(bodyAttackTime);
  });

  it('starts the sustained reverb send wider when vibrato is already engaged', async () => {
    const brightness = 0.74;
    const velocity = 0.78;
    const frequencyHz = 261.63;

    const calmHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await calmHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-vibrato-calm',
          velocity,
          vibratoDepth: 0,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-vibrato-calm' }
      );
    });

    const calmReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      resolveExpectedSustainedVibratoReverbSendGain(brightness, velocity, frequencyHz, 0)
    );
    expect(calmReverbSendGainNode).toBeDefined();
    const calmSend = calmReverbSendGainNode?.gain.value ?? 0;

    const activeHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await activeHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-vibrato-active',
          velocity,
          vibratoDepth: 1,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-vibrato-active' }
      );
    });

    const activeReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      resolveExpectedSustainedVibratoReverbSendGain(brightness, velocity, frequencyHz, 1)
    );
    expect(activeReverbSendGainNode).toBeDefined();
    expect(activeReverbSendGainNode?.gain.value ?? 0).toBeGreaterThan(calmSend);
  });

  it('lets the sustained reverb pan bloom slightly after the dry image on note-on', async () => {
    const stereoPan = -0.34;
    const frequencyHz = 261.63;
    const velocity = 0.72;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      0.79,
      frequencyHz
    );
    const expectedDryPanAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      stereoPan
    );
    const expectedWetPanAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      stereoPan,
      true
    );
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.79,
          frequencyHz,
          id: 'pan-bloom',
          stereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-bloom' }
      );
    });

    const dryPanner = findPannerNodeByRampTarget(createdContexts[0], stereoPan);
    const reverbPanner = findPannerNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbPan(stereoPan)
    );
    expect(dryPanner).toBeDefined();
    expect(reverbPanner).toBeDefined();

    const dryAttackTime = dryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const wetAttackTime = reverbPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(dryAttackTime).toBe(expectedDryPanAttackTime);
    expect(wetAttackTime).toBe(expectedWetPanAttackTime);
    expect(wetAttackTime).toBeGreaterThan(dryAttackTime);
  });
});
