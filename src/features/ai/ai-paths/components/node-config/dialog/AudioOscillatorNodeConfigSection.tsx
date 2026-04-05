'use client';

import type { AudioWaveform } from '@/shared/lib/ai-paths';
import { toNumber } from '@/shared/lib/ai-paths';
import { Input } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const WAVEFORM_OPTIONS: AudioWaveform[] = ['sine', 'square', 'triangle', 'sawtooth'];

const waveformOptions = WAVEFORM_OPTIONS.map((w) => ({ value: w, label: w }));

export function AudioOscillatorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  if (selectedNode?.type !== 'audio_oscillator') return null;

  const oscillatorConfig = selectedNode.config?.audioOscillator ?? {
    waveform: 'sine' as AudioWaveform,
    frequencyHz: 440,
    gain: 0.25,
    durationMs: 400,
  };

  return (
    <div className='space-y-4'>
      <FormField label='Waveform'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={oscillatorConfig.waveform}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              audioOscillator: {
                ...oscillatorConfig,
                waveform: value as AudioWaveform,
              },
            })
          }
          options={waveformOptions}
          placeholder='Select waveform'
         ariaLabel='Select waveform' title='Select waveform'/>
      </FormField>

      <FormField label='Frequency (Hz)'>
        <Input
          type='number'
          min='20'
          max='20000'
          step='1'
          variant='subtle'
          size='sm'
          value={oscillatorConfig.frequencyHz}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              audioOscillator: {
                ...oscillatorConfig,
                frequencyHz: toNumber(event.target.value, oscillatorConfig.frequencyHz ?? 440),
              },
            })
          }
         aria-label='Frequency (Hz)' title='Frequency (Hz)'/>
      </FormField>

      <FormField label='Gain (0-1)'>
        <Input
          type='number'
          min='0'
          max='1'
          step='0.01'
          variant='subtle'
          size='sm'
          value={oscillatorConfig.gain}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              audioOscillator: {
                ...oscillatorConfig,
                gain: toNumber(event.target.value, oscillatorConfig.gain ?? 0.5),
              },
            })
          }
         aria-label='Gain (0-1)' title='Gain (0-1)'/>
      </FormField>

      <FormField label='Duration (ms)'>
        <Input
          type='number'
          min='30'
          max='10000'
          step='10'
          variant='subtle'
          size='sm'
          value={oscillatorConfig.durationMs}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              audioOscillator: {
                ...oscillatorConfig,
                durationMs: toNumber(event.target.value, oscillatorConfig.durationMs ?? 1000),
              },
            })
          }
         aria-label='Duration (ms)' title='Duration (ms)'/>
      </FormField>

      <p className='text-[11px] text-gray-500'>
        Emits audioSignal payloads that can be connected to Audio Speaker nodes.
      </p>
    </div>
  );
}
