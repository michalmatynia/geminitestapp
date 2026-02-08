'use client';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';
import { Input, Label, Checkbox, UnifiedSelect, SectionPanel } from '@/shared/ui';

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
    <div className='space-y-4'>
      <h3 className='text-lg font-medium text-white'>Agent Settings</h3>
      <div className='flex items-center gap-4'>
        <Label className='flex items-center gap-2 text-sm text-gray-300'>
          <Checkbox
            checked={agentModeEnabled}
            onCheckedChange={(checked: boolean) => setAgentModeEnabled(Boolean(checked))}
          />
          Enable Agent Mode
        </Label>
      </div>
      {agentModeEnabled && (
        <SectionPanel variant='subtle' className='space-y-4 p-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Browser</Label>
              <UnifiedSelect
                value={agentBrowser}
                onValueChange={setAgentBrowser}
                options={[
                  { value: 'chromium', label: 'Chromium' },
                  { value: 'firefox', label: 'Firefox' },
                  { value: 'webkit', label: 'WebKit' },
                ]}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='agent-max-steps'>Max Steps</Label>
              <Input
                id='agent-max-steps'
                type='number'
                value={agentMaxSteps}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgentMaxSteps(Number(e.target.value))}
              />
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-4'>
            <Label className='flex items-center gap-2 text-sm text-gray-300'>
              <Checkbox
                checked={agentRunHeadless}
                onCheckedChange={(checked: boolean) =>
                  setAgentRunHeadless(Boolean(checked))
                }
              />
              Run Headless
            </Label>
            <Label className='flex items-center gap-2 text-sm text-gray-300'>
              <Checkbox
                checked={agentIgnoreRobotsTxt}
                onCheckedChange={(checked: boolean) =>
                  setAgentIgnoreRobotsTxt(Boolean(checked))
                }
              />
              Ignore robots.txt
            </Label>
            <Label className='flex items-center gap-2 text-sm text-gray-300'>
              <Checkbox
                checked={agentRequireHumanApproval}
                onCheckedChange={(checked: boolean) =>
                  setAgentRequireHumanApproval(Boolean(checked))
                }
              />
              Require Approval
            </Label>
          </div>
        </SectionPanel>
      )}
    </div>
  );
}