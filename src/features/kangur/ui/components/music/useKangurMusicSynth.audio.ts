import { buildReverbImpulse } from './useKangurMusicSynth.utils';

import type { ReverbChain } from './useKangurMusicSynth.types';

export const ensureReverbChain = (
  context: AudioContext,
  reverbRef: { current: ReverbChain | null },
  compressor: DynamicsCompressorNode
): ReverbChain => {
  if (reverbRef.current) {
    return reverbRef.current;
  }

  const convolver = context.createConvolver();
  convolver.buffer = buildReverbImpulse(context);
  convolver.normalize = true;
  const outputGain = context.createGain();
  outputGain.gain.value = 0.20;
  convolver.connect(outputGain);
  outputGain.connect(compressor);
  reverbRef.current = { convolver, outputGain };
  return reverbRef.current;
};

export const ensureCompressorNode = (
  context: AudioContext,
  compressorRef: { current: DynamicsCompressorNode | null }
): DynamicsCompressorNode => {
  if (compressorRef.current) {
    return compressorRef.current;
  }

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 6;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.10;
  compressor.connect(context.destination);
  compressorRef.current = compressor;
  return compressor;
};
