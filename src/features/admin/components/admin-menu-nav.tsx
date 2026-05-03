import { HomeIcon } from './menu/icons';
import type { NavItem } from './menu/admin-menu-utils';
import React from 'react';
import { getWorkspaceNav } from './menu/workspace';
import { getCommerceNav } from './menu/commerce';
import { getFilemakerNav, getImageStudioNav, getPromptExploderNav } from './menu/misc-sections';
import { getIntegrationsNav, getBrainNav, getJobsNav, getAiNav } from './menu/ai-integrations';
import { getContentNav, getSystemNav } from './menu/content-system';

export const buildAdminNav = (handlers: {
  onOpenChat: React.MouseEventHandler<HTMLAnchorElement>;
  onCreatePageClick: () => void;
}): NavItem[] => [
  {
    id: 'home',
    label: 'Home',
    href: '/admin',
    icon: <HomeIcon className='size-4' />,
    keywords: ['dashboard', 'home'],
  },
  getWorkspaceNav(),
  getFilemakerNav(),
  getImageStudioNav(),
  getPromptExploderNav(),
  getCommerceNav(),
  getIntegrationsNav(),
  getBrainNav(),
  getJobsNav(),
  getAiNav({ onOpenChat: handlers.onOpenChat }),
  getContentNav({ onCreatePageClick: handlers.onCreatePageClick }),
  getSystemNav(),
];
