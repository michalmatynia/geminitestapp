import { Plug, Brain, WorkflowIcon, GitBranchIcon, MessageCircleIcon } from './icons';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

export const getIntegrationsNav = (): NavItem => ({
  id: 'integrations',
  label: 'Integrations',
  href: '/admin/integrations',
  icon: <Plug className='size-4' />,
  children: [
    { id: 'integrations/connections', label: 'Connections', href: '/admin/integrations' },
    { id: 'integrations/add', label: 'Add Integration', href: '/admin/integrations/add' },
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
