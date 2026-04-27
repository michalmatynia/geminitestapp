import { StickyNoteIcon, SettingsIcon, MapIcon, BarChart3Icon, ActivityIcon, ShieldIcon } from './icons';
import { FileText } from 'lucide-react';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

export const getContentNav = (handlers: { onCreatePageClick: () => void }): NavItem => ({
  id: 'content',
  label: 'Content',
  href: '/admin/notes',
  children: [
    {
      id: 'content/notes',
      label: 'Notes',
      href: '/admin/notes',
      icon: <StickyNoteIcon className='size-4' />,
    },
    {
      id: 'content/cms',
      label: 'CMS',
      href: '/admin/cms',
      children: [
        {
          id: 'content/cms/pages/create',
          label: 'Create Page',
          keywords: ['new page'],
          href: '/admin/cms/pages/create',
          onClick: (event: React.MouseEvent<HTMLAnchorElement>): void => {
            event.preventDefault();
            handlers.onCreatePageClick();
          },
        },
      ],
    },
  ],
});

export const getSystemNav = (): NavItem => ({
  id: 'system',
  label: 'System',
  href: '/admin/settings',
  icon: <SettingsIcon className='size-4' />,
  children: [
    { id: 'system/settings/text-editors', label: 'Text Editors', href: '/admin/settings/text-editors' },
    { id: 'system/settings/filemaker-invoice-pdf', label: 'Invoice PDF', href: '/admin/settings/filemaker-invoice-pdf', icon: <FileText className='size-4' /> },
    { id: 'system/routes', label: 'Route Map', href: '/admin/routes', icon: <MapIcon className='size-4' /> },
    { id: 'system/analytics', label: 'Analytics', href: '/admin/system/analytics', icon: <BarChart3Icon className='size-4' /> },
    { id: 'system/logs', label: 'System Logs', href: '/admin/system/logs', icon: <ActivityIcon className='size-4' /> },
    { id: 'system/auth', label: 'Auth', href: '/admin/auth', icon: <ShieldIcon className='size-4' /> },
  ],
});
