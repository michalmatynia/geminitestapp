import { Plug, Brain, WorkflowIcon, GitBranchIcon, MessageCircleIcon } from './icons';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

const marketplaceNav: NavItem[] = [
  {
    id: 'integrations/marketplaces/tradera',
    label: 'Tradera',
    href: '/admin/integrations/marketplaces/tradera',
    children: [
      {
        id: 'integrations/marketplaces/tradera/category-mapping',
        label: 'Category Mapping',
        href: '/admin/integrations/marketplaces/category-mapper?marketplace=tradera',
      },
      {
        id: 'integrations/marketplaces/tradera/parameter-mapping',
        label: 'Parameter Mapping',
        href: '/admin/integrations/marketplaces/tradera/parameter-mapping',
      },
      {
        id: 'integrations/marketplaces/tradera/selectors',
        label: 'Selector Registry',
        href: '/admin/integrations/selectors?namespace=tradera',
      },
    ],
  },
  {
    id: 'playwright/programmable',
    label: 'Programmable Playwright',
    href: '/admin/playwright/programmable/script',
    children: [
      {
        id: 'playwright/programmable/script',
        label: 'Script Editor',
        href: '/admin/playwright/programmable/script',
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
      href: '/admin/integrations/aggregators',
      children: aggregatorNav,
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

export const getAiNav = (handlers: { onOpenChat: React.MouseEventHandler<HTMLAnchorElement> }): NavItem => ({
  id: 'ai',
  label: 'AI',
  href: '/admin/ai-paths',
  icon: <GitBranchIcon className='size-4' />,
  children: [
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
      ],
    },
  ],
});
