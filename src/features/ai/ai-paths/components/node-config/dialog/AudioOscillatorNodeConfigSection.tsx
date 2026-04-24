'use client';

import type { AudioWaveform } from '@/shared/contracts/ai-paths';
import { toNumber } from '@/shared/lib/ai-paths/core/utils';
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

  const updateConfig = (patch: Partial<typeof oscillatorConfig>): void => {
    updateSelectedNodeConfig({
      audioOscillator: {
        ...oscillatorConfig,
        ...patch,
      },
    });
  };

  return (
    <div className='space-y-4'>
      <WaveformField
        value={oscillatorConfig.waveform}
        onChange={(waveform) => updateConfig({ waveform })}
      />

      <FrequencyField
        value={oscillatorConfig.frequencyHz}
        onChange={(frequencyHz) => updateConfig({ frequencyHz })}
      />

      <GainField value={oscillatorConfig.gain} onChange={(gain) => updateConfig({ gain })} />

      <DurationField
        value={oscillatorConfig.durationMs}
        onChange={(durationMs) => updateConfig({ durationMs })}
      />

      <p className='text-[11px] text-gray-500'>
        Emits audioSignal payloads that can be connected to Audio Speaker nodes.
      </p>
    </div>
  );
}

function WaveformField({
  value,
  onChange,
}: {
  value: AudioWaveform;
  onChange: (v: AudioWaveform) => void;
}): React.JSX.Element {
  return (
    <FormField label='Waveform'>
      <SelectSimple
        size='sm'
        variant='subtle'
        value={value}
        onValueChange={(v: string): void => onChange(v as AudioWaveform)}
        options={waveformOptions}
        placeholder='Select waveform'
        ariaLabel='Select waveform'
        title='Select waveform'
      />
    </FormField>
  );
}

function FrequencyField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <FormField label='Frequency (Hz)'>
      <Input
        type='number'
        min='20'
        max='20000'
        step='1'
        variant='subtle'
        size='sm'
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(toNumber(event.target.value, value ?? 440))
        }
        aria-label='Frequency (Hz)'
        title='Frequency (Hz)'
      />
    </FormField>
  );
}

function GainField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <FormField label='Gain (0-1)'>
      <Input
        type='number'
        min='0'
        max='1'
        step='0.01'
        variant='subtle'
        size='sm'
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(toNumber(event.target.value, value ?? 0.5))
        }
        aria-label='Gain (0-1)'
        title='Gain (0-1)'
      />
    </FormField>
  );
}

function DurationField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <FormField label='Duration (ms)'>
      <Input
        type='number'
        min='30'
        max='10000'
        step='10'
        variant='subtle'
        size='sm'
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(toNumber(event.target.value, value ?? 1000))
        }
        aria-label='Duration (ms)'
        title='Duration (ms)'
      />
    </FormField>
  );
}
