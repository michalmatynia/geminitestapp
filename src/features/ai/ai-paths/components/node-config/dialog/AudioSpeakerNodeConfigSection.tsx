'use client';

import { toNumber } from '@/shared/lib/ai-paths';
import { Input, ToggleRow, FormField, Hint } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

export function AudioSpeakerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  if (selectedNode?.type !== 'audio_speaker') return null;

  const speakerConfig = selectedNode.config?.audioSpeaker ?? {
    enabled: true,
    autoPlay: true,
    gain: 1,
    stopPrevious: true,
  };

  return (
    <div className='space-y-4'>
      <ToggleRow
        label='Enabled'
        description='Mute/unmute this speaker node.'
        checked={speakerConfig.enabled ?? true}
        onCheckedChange={(checked: boolean): void =>
          updateSelectedNodeConfig({
            audioSpeaker: {
              ...speakerConfig,
              enabled: checked,
            },
          })
        }
        variant='switch'
      />

      <ToggleRow
        label='Auto Play'
        description='Play immediately when a signal arrives.'
        checked={speakerConfig.autoPlay ?? false}
        onCheckedChange={(checked: boolean): void =>
          updateSelectedNodeConfig({
            audioSpeaker: {
              ...speakerConfig,
              autoPlay: checked,
            },
          })
        }
        variant='switch'
      />

      <ToggleRow
        label='Stop Previous Tone'
        description='Keep mono output clean on repeated signals.'
        checked={speakerConfig.stopPrevious ?? true}
        onCheckedChange={(checked: boolean): void =>
          updateSelectedNodeConfig({
            audioSpeaker: {
              ...speakerConfig,
              stopPrevious: checked,
            },
          })
        }
        variant='switch'
      />

      <FormField label='Speaker Gain (0-1)'>
        <Input
          type='number'
          min='0'
          max='1'
          step='0.01'
          variant='subtle'
          size='sm'
          value={speakerConfig.gain ?? 0.5}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              audioSpeaker: {
                ...speakerConfig,
                gain: toNumber(event.target.value, speakerConfig.gain ?? 0.5),
              },
            })
          }
        />
      </FormField>

      <Hint italic>
        Web Audio playback is available in local execution mode. Some browsers require a user
        interaction first.
      </Hint>
    </div>
  );
}
