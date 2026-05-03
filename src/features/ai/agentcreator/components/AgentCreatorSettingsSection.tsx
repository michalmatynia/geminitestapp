'use client';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Input } from '@/shared/ui/primitives.public';
import { SelectSimple, FormSection, FormField, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const AGENT_BROWSER_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'chromium' | 'firefox' | 'webkit'>>;

export function AgentCreatorSettingsSection(): React.ReactElement {
  const settings = useAgentCreatorSettings();

  return (
    <FormSection title='Agent Settings' variant='subtle' className='p-4'>
      <div className='mt-2'>
        <ToggleRow
          id='agent-mode-enabled'
          label='Enable Agent Mode'
          description='Allow the chatbot to use automated browser agents.'
          checked={settings.agentModeEnabled}
          onCheckedChange={settings.setAgentModeEnabled}
          variant='switch'
        />
      </div>

      {settings.agentModeEnabled && <AgentConfigFields settings={settings} />}
    </FormSection>
  );
}

function AgentConfigFields({
  settings,
}: {
  settings: ReturnType<typeof useAgentCreatorSettings>;
}): React.ReactElement {
  return (
    <div className='space-y-4 mt-4'>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField label='Browser'>
          <SelectSimple
            size='sm'
            value={settings.agentBrowser}
            onValueChange={settings.setAgentBrowser}
            options={AGENT_BROWSER_OPTIONS}
            ariaLabel='Browser'
            title='Browser'
          />
        </FormField>

        <FormField label='Max Steps' id='agent-max-steps'>
          <Input
            id='agent-max-steps'
            type='number'
            value={settings.agentMaxSteps}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              settings.setAgentMaxSteps(Number(e.target.value))
            }
            aria-label='Max Steps'
            title='Max Steps'
          />
        </FormField>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        <ToggleRow
          id='agent-run-headless'
          label='Run Headless'
          description="Don't show browser window"
          checked={settings.agentRunHeadless ?? false}
          onCheckedChange={settings.setAgentRunHeadless}
        />
        <ToggleRow
          id='agent-ignore-robots'
          label='Ignore robots.txt'
          description='Bypass scraping restrictions'
          checked={settings.agentIgnoreRobotsTxt ?? false}
          onCheckedChange={settings.setAgentIgnoreRobotsTxt}
        />
        <ToggleRow
          id='agent-require-approval'
          label='Require Approval'
          description='Ask before critical actions'
          checked={settings.agentRequireHumanApproval ?? false}
          onCheckedChange={settings.setAgentRequireHumanApproval}
        />
      </div>
    </div>
  );
}
