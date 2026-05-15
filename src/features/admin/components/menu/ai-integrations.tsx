import { Plug, Brain, WorkflowIcon, GitBranchIcon, MessageCircleIcon } from './icons';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

const marketplaceNav: NavItem[] = [
  {
    id: 'integrations/marketplaces/tradera',
    label: 'Tradera',
    href: '/admin/integrations/tradera',
    children: [
      {
        id: 'integrations/marketplaces/tradera/category-mapping',
        label: 'Category Mapping',
        href: '/admin/integrations/marketplaces/tradera/category-mapping',
      },
      {
        id: 'integrations/marketplaces/tradera/parameter-mapping',
        label: 'Parameter Mapping',
        href: '/admin/integrations/marketplaces/tradera/parameter-mapping',
      },
      {
        id: 'integrations/marketplaces/tradera/selectors',
        label: 'Selector Registry',
        href: '/admin/integrations/marketplaces/tradera/selectors',
      },
    ],
  },
  {
    id: 'integrations/marketplaces/allegro',
    label: 'Allegro',
    href: '/admin/integrations/marketplaces/allegro',
    children: [
      {
        id: 'integrations/marketplaces/allegro/connections',
        label: 'Connections',
        href: '/admin/integrations/marketplaces/allegro/connections',
      },
      {
        id: 'integrations/marketplaces/allegro/listing-management',
        label: 'Listing Management',
        href: '/admin/integrations/marketplaces/allegro/listing-management',
      },
      {
        id: 'integrations/marketplaces/allegro/listing-templates',
        label: 'Listing Templates',
        href: '/admin/integrations/marketplaces/allegro/listing-templates',
      },
      {
        id: 'integrations/marketplaces/allegro/messages',
        label: 'Messages',
        href: '/admin/integrations/marketplaces/allegro/messages',
      },
      {
        id: 'integrations/marketplaces/allegro/parameter-mapping',
        label: 'Parameter Mapping',
        href: '/admin/integrations/marketplaces/allegro/parameter-mapping',
      },
      {
        id: 'integrations/marketplaces/allegro/shipping-price-management',
        label: 'Shipping Prices',
        href: '/admin/integrations/marketplaces/allegro/shipping-price-management',
      },
    ],
  },
  {
    id: 'integrations/marketplaces/category-mapper',
    label: 'Category Mapper',
    href: '/admin/integrations/marketplaces/category-mapper',
  },
  {
    id: 'playwright/programmable',
    label: 'Programmable Playwright',
    href: '/admin/playwright/programmable',
    children: [
      {
        id: 'playwright/programmable/overview',
        label: 'Overview',
        href: '/admin/playwright/programmable',
        exact: true,
      },
      {
        id: 'playwright/programmable/script',
        label: 'Script Editor',
        href: '/admin/playwright/programmable/script',
      },
      {
        id: 'playwright/programmable/import',
        label: 'Import',
        href: '/admin/playwright/programmable/import',
      },
    ],
  },
  {
    id: 'integrations/marketplaces/playwright',
    label: 'Marketplace Playwright',
    href: '/admin/integrations/marketplaces/playwright',
    children: [
      {
        id: 'integrations/marketplaces/playwright/script',
        label: 'Script',
        href: '/admin/integrations/marketplaces/playwright/script',
      },
      {
        id: 'integrations/marketplaces/playwright/import',
        label: 'Import',
        href: '/admin/integrations/marketplaces/playwright/import',
      },
    ],
  },
];

const aggregatorNav: NavItem[] = [
  {
    id: 'integrations/aggregators/base-com',
    label: 'Base.com',
    href: '/admin/integrations/aggregators/base-com/import-export',
    children: [
      {
        id: 'integrations/aggregators/base-com/import-export',
        label: 'Export',
        href: '/admin/integrations/aggregators/base-com/import-export',
      },
      {
        id: 'integrations/aggregators/base-com/category-mapping',
        label: 'Category Mapping',
        href: '/admin/integrations/aggregators/base-com/category-mapping',
      },
      {
        id: 'integrations/aggregators/base-com/synchronization-engine',
        label: 'Synchronization Engine',
        href: '/admin/integrations/aggregators/base-com/synchronization-engine',
      },
    ],
  },
];

export const getIntegrationsNav = (): NavItem => ({
  id: 'integrations',
  label: 'Integrations',
  href: '/admin/integrations',
  icon: <Plug className='size-4' />,
  children: [
    { id: 'integrations/connections', label: 'Connections', href: '/admin/integrations' },
    { id: 'integrations/add', label: 'Add Integration', href: '/admin/integrations/add' },
    {
      id: 'integrations/marketplaces',
      label: 'Marketplaces',
      href: '/admin/integrations/marketplaces',
      children: marketplaceNav,
    },
    {
      id: 'integrations/aggregators',
      label: 'Aggregators',
      href: '/admin/integrations/aggregators/base-com/import-export',
      children: aggregatorNav,
    },
    {
      id: 'integrations/selectors',
      label: 'Selector Registry',
      href: '/admin/integrations/selectors',
      children: [
        { id: 'integrations/selectors/1688', label: '1688 Selectors', href: '/admin/integrations/1688/selectors' },
        { id: 'integrations/selectors/amazon', label: 'Amazon Selectors', href: '/admin/integrations/amazon/selectors' },
      ],
    },
    {
      id: 'playwright/tools',
      label: 'Playwright Tools',
      href: '/admin/playwright/step-sequencer',
      children: [
        { id: 'playwright/step-sequencer', label: 'Step Sequencer', href: '/admin/playwright/step-sequencer' },
        { id: 'playwright/step-sequencer/scripter', label: 'Live Scripter', href: '/admin/playwright/step-sequencer/scripter' },
        { id: 'playwright/step-sequencer/runs', label: 'Sequencer Runs', href: '/admin/playwright/step-sequencer/runs' },
        { id: 'playwright/action-runs', label: 'Action Runs', href: '/admin/playwright/action-runs' },
        { id: 'playwright/scripters', label: 'Scripters', href: '/admin/playwright/scripters' },
      ],
    },
  ],
});

export const getBrainNav = (): NavItem => ({
  id: 'brain',
  label: 'Brain',
  href: '/admin/brain?tab=operations',
  icon: <Brain className='size-4' />,
});

export const getJobsNav = (): NavItem => ({
  id: 'jobs',
  label: 'Jobs',
  href: '/admin/ai-paths/queue',
  icon: <WorkflowIcon className='size-4' />,
  children: [{ id: 'jobs/queue', label: 'Job Queue', href: '/admin/ai-paths/queue' }],
});

const caseResolverNav: NavItem[] = [
  { id: 'ai/case-resolver/overview', label: 'Overview', href: '/admin/case-resolver', exact: true },
  { id: 'ai/case-resolver/cases', label: 'Cases', href: '/admin/case-resolver/cases' },
  { id: 'ai/case-resolver/capture', label: 'Capture', href: '/admin/case-resolver/capture' },
  { id: 'ai/case-resolver/categories', label: 'Categories', href: '/admin/case-resolver/categories' },
  { id: 'ai/case-resolver/identifiers', label: 'Identifiers', href: '/admin/case-resolver/identifiers' },
  { id: 'ai/case-resolver/tags', label: 'Tags', href: '/admin/case-resolver/tags' },
  { id: 'ai/case-resolver/preferences', label: 'Preferences', href: '/admin/case-resolver/preferences' },
  { id: 'ai/case-resolver/settings', label: 'Settings', href: '/admin/case-resolver/settings' },
];

const agentCreatorNav: NavItem[] = [
  { id: 'ai/agentcreator/overview', label: 'Overview', href: '/admin/agentcreator', exact: true },
  { id: 'ai/agentcreator/personas', label: 'Personas', href: '/admin/agentcreator/personas' },
  { id: 'ai/agentcreator/runs', label: 'Runs', href: '/admin/agentcreator/runs' },
  {
    id: 'ai/agentcreator/teaching',
    label: 'Teaching',
    href: '/admin/agentcreator/teaching',
    children: [
      { id: 'ai/agentcreator/teaching/agents', label: 'Agents', href: '/admin/agentcreator/teaching/agents' },
      { id: 'ai/agentcreator/teaching/chat', label: 'Chat', href: '/admin/agentcreator/teaching/chat' },
      { id: 'ai/agentcreator/teaching/collections', label: 'Collections', href: '/admin/agentcreator/teaching/collections' },
    ],
  },
];

export const getAiNav = (handlers: { onOpenChat: React.MouseEventHandler<HTMLAnchorElement> }): NavItem => ({
  id: 'ai',
  label: 'AI',
  href: '/admin/ai-paths',
  icon: <GitBranchIcon className='size-4' />,
  required: true,
  children: [
    {
      id: 'ai/ai-paths',
      label: 'Canvas',
      href: '/admin/ai-paths',
      icon: <GitBranchIcon className='size-4' />,
      keywords: ['ai paths', 'canvas', 'workflow', 'graph'],
      required: true,
      children: [
        { id: 'ai/ai-paths/queue', label: 'Queue', href: '/admin/ai-paths/queue' },
        { id: 'ai/ai-paths/trigger-buttons', label: 'Trigger Buttons', href: '/admin/ai-paths/trigger-buttons' },
        { id: 'ai/ai-paths/validation', label: 'Validation', href: '/admin/ai-paths/validation' },
      ],
    },
    {
      id: 'ai/case-resolver',
      label: 'Case Resolver',
      href: '/admin/case-resolver',
      children: caseResolverNav,
    },
    {
      id: 'ai/agentcreator',
      label: 'Agent Creator',
      href: '/admin/agentcreator',
      children: agentCreatorNav,
    },
    {
      id: 'ai/prompt-engine/validation',
      label: 'Prompt Validation',
      href: '/admin/prompt-engine/validation',
    },
    {
      id: 'ai/chatbot',
      label: 'Chatbot',
      href: '/admin/chatbot',
      children: [
        {
          id: 'ai/chatbot/chat',
          label: 'Chat',
          href: '/admin/chatbot',
          icon: <MessageCircleIcon className='size-4' />,
          onClick: handlers.onOpenChat,
        },
        { id: 'ai/chatbot/context', label: 'Context', href: '/admin/chatbot/context' },
        { id: 'ai/chatbot/memory', label: 'Memory', href: '/admin/chatbot/memory' },
        { id: 'ai/chatbot/sessions', label: 'Sessions', href: '/admin/chatbot/sessions' },
      ],
    },
  ],
});
