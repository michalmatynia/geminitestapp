'use client';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Input, SelectSimple, FormSection, FormField, ToggleRow } from '@/shared/ui';

const AGENT_BROWSER_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'chromium' | 'firefox' | 'webkit'>>;

export function AgentCreatorSettingsSection(): React.ReactElement {
  const {
    agentModeEnabled,
    setAgentModeEnabled,
    agentBrowser,
    setAgentBrowser,
    agentMaxSteps,
    setAgentMaxSteps,
    agentRunHeadless,
    setAgentRunHeadless,
    agentIgnoreRobotsTxt,
    setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval,
    setAgentRequireHumanApproval,
  } = useAgentCreatorSettings();

  return (
    <FormSection title='Agent Settings' variant='subtle' className='p-4'>
      <div className='mt-2'>
        <ToggleRow
          id='agent-mode-enabled'
          label='Enable Agent Mode'
          description='Allow the chatbot to use automated browser agents.'
          checked={agentModeEnabled}
          onCheckedChange={setAgentModeEnabled}
          variant='switch'
        />
      </div>

      {agentModeEnabled && (
        <div className='space-y-4 mt-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Browser'>
              <SelectSimple
                size='sm'
                value={agentBrowser}
                onValueChange={setAgentBrowser}
                options={AGENT_BROWSER_OPTIONS}
               ariaLabel='Browser' title='Browser'/>
            </FormField>

            <FormField label='Max Steps' id='agent-max-steps'>
              <Input
                id='agent-max-steps'
                type='number'
                value={agentMaxSteps}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgentMaxSteps(Number(e.target.value))
                }
               aria-label='Max Steps' title='Max Steps'/>
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <ToggleRow
              id='agent-run-headless'
              label='Run Headless'
              description="Don't show browser window"
              checked={agentRunHeadless ?? false}
              onCheckedChange={setAgentRunHeadless}
            />
            <ToggleRow
              id='agent-ignore-robots'
              label='Ignore robots.txt'
              description='Bypass scraping restrictions'
              checked={agentIgnoreRobotsTxt ?? false}
              onCheckedChange={setAgentIgnoreRobotsTxt}
            />
            <ToggleRow
              id='agent-require-approval'
              label='Require Approval'
              description='Ask before critical actions'
              checked={agentRequireHumanApproval ?? false}
              onCheckedChange={setAgentRequireHumanApproval}
            />
          </div>
        </div>
      )}
    </FormSection>
  );
}
