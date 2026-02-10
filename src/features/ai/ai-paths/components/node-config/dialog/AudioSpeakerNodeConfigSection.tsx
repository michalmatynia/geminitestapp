'use client';

import { toNumber } from '@/features/ai/ai-paths/lib';
import { Input, Label, Switch } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function AudioSpeakerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  if (!selectedNode || selectedNode.type !== 'audio_speaker') return null;

  const speakerConfig = selectedNode.config?.audioSpeaker ?? {
    enabled: true,
    autoPlay: true,
    gain: 1,
    stopPrevious: true,
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-4 rounded-md border border-border bg-card/60 px-3 py-2'>
        <div>
          <div className='text-xs font-medium text-gray-200'>Enabled</div>
          <div className='text-[11px] text-gray-500'>Mute/unmute this speaker node.</div>
        </div>
        <Switch
          checked={speakerConfig.enabled}
          onCheckedChange={(checked: boolean): void =>
            updateSelectedNodeConfig({
              audioSpeaker: {
                ...speakerConfig,
                enabled: checked,
              },
            })
          }
        />
      </div>

      <div className='flex items-center justify-between gap-4 rounded-md border border-border bg-card/60 px-3 py-2'>
        <div>
          <div className='text-xs font-medium text-gray-200'>Auto Play</div>
          <div className='text-[11px] text-gray-500'>Play immediately when a signal arrives.</div>
        </div>
        <Switch
          checked={speakerConfig.autoPlay}
          onCheckedChange={(checked: boolean): void =>
            updateSelectedNodeConfig({
              audioSpeaker: {
                ...speakerConfig,
                autoPlay: checked,
              },
            })
          }
        />
      </div>

      <div className='flex items-center justify-between gap-4 rounded-md border border-border bg-card/60 px-3 py-2'>
        <div>
          <div className='text-xs font-medium text-gray-200'>Stop Previous Tone</div>
          <div className='text-[11px] text-gray-500'>Keep mono output clean on repeated signals.</div>
        </div>
        <Switch
          checked={speakerConfig.stopPrevious}
          onCheckedChange={(checked: boolean): void =>
            updateSelectedNodeConfig({
              audioSpeaker: {
                ...speakerConfig,
                stopPrevious: checked,
              },
            })
          }
        />
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Speaker Gain (0-1)</Label>
        <Input
          type='number'
          min='0'
          max='1'
          step='0.01'
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={speakerConfig.gain}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              audioSpeaker: {
                ...speakerConfig,
                gain: toNumber(event.target.value, speakerConfig.gain),
              },
            })
          }
        />
      </div>

      <p className='text-[11px] text-gray-500'>
        Web Audio playback is available in local execution mode. Some browsers require a user interaction first.
      </p>
    </div>
  );
}

