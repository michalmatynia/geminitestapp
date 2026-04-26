import { HomeIcon } from './icons';
import type { NavItem } from '../menu/admin-menu-utils';
import React from 'react';
import { getWorkspaceNav } from './workspace';
import { getCommerceNav } from './commerce';
import { getFilemakerNav, getImageStudioNav, getPromptExploderNav } from './misc-sections';
import { getIntegrationsNav, getBrainNav, getJobsNav, getAiNav } from './ai-integrations';
import { getContentNav, getSystemNav } from './content-system';

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
  getWorkspaceNav() as NavItem,
  getFilemakerNav() as NavItem,
  getImageStudioNav() as NavItem,
  getPromptExploderNav() as NavItem,
  getCommerceNav() as NavItem,
  getIntegrationsNav() as NavItem,
  getBrainNav() as NavItem,
  getJobsNav() as NavItem,
  getAiNav({ onOpenChat: handlers.onOpenChat }) as NavItem,
  getContentNav({ onCreatePageClick: handlers.onCreatePageClick }) as NavItem,
  getSystemNav() as NavItem,
];
