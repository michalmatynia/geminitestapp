'use client';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';
import { Input, SelectSimple, FormSection, FormField, ToggleRow } from '@/shared/ui';

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
          label='Enable Agent Mode'
          description='Allow the chatbot to use automated browser agents.'
          checked={agentModeEnabled}
          onCheckedChange={setAgentModeEnabled}
          type='switch'
        />
      </div>

      {agentModeEnabled && (

        <div className='space-y-4 mt-4'>

          <div className='grid gap-4 md:grid-cols-2'>

            <FormField label='Browser'>

              <SelectSimple size='sm'

                value={agentBrowser}

                onValueChange={setAgentBrowser}

                options={[

                  { value: 'chromium', label: 'Chromium' },

                  { value: 'firefox', label: 'Firefox' },

                  { value: 'webkit', label: 'WebKit' },

                ]}

              />

            </FormField>

            <FormField label='Max Steps' id='agent-max-steps'>

              <Input

                id='agent-max-steps'

                type='number'

                value={agentMaxSteps}

                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgentMaxSteps(Number(e.target.value))}

              />

            </FormField>

          </div>

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <ToggleRow
              label='Run Headless'
              description='Don&apos;t show browser window'
              checked={agentRunHeadless}
              onCheckedChange={setAgentRunHeadless}
            />
            <ToggleRow
              label='Ignore robots.txt'
              description='Bypass scraping restrictions'
              checked={agentIgnoreRobotsTxt}
              onCheckedChange={setAgentIgnoreRobotsTxt}
            />
            <ToggleRow
              label='Require Approval'
              description='Ask before critical actions'
              checked={agentRequireHumanApproval}
              onCheckedChange={setAgentRequireHumanApproval}
            />
          </div>

        </div>

      )}

    </FormSection>

  );

}

  
