'use client';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';
import { Input, Checkbox, SelectSimple, FormSection, FormField } from '@/shared/ui';

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

      <div className='flex items-center gap-4 mt-4'>

        <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>

          <Checkbox

            checked={agentModeEnabled}

            onCheckedChange={(checked: boolean) => setAgentModeEnabled(Boolean(checked))}

          />

            Enable Agent Mode

        </label>

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

          <div className='flex flex-wrap items-center gap-4'>

            <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>

              <Checkbox

                checked={agentRunHeadless}

                onCheckedChange={(checked: boolean) =>

                  setAgentRunHeadless(Boolean(checked))

                }

              />

                Run Headless

            </label>

            <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>

              <Checkbox

                checked={agentIgnoreRobotsTxt}

                onCheckedChange={(checked: boolean) =>

                  setAgentIgnoreRobotsTxt(Boolean(checked))

                }

              />

                Ignore robots.txt

            </label>

            <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>

              <Checkbox

                checked={agentRequireHumanApproval}

                onCheckedChange={(checked: boolean) =>

                  setAgentRequireHumanApproval(Boolean(checked))

                }

              />

                Require Approval

            </label>

          </div>

        </div>

      )}

    </FormSection>

  );

}

  
