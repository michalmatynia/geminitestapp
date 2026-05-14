import React from 'react';
import { type NavItem } from './admin-menu-utils';
import { AppWindow } from './icons';

export const getWorkspaceNav = (): NavItem => ({
  id: 'workspace',
  label: 'Workspace',
  icon: <AppWindow className='size-4' />,
  children: [
    { id: 'workspace/front-manage', label: 'Front Manage', href: '/admin/front-manage' },
    { id: 'workspace/import', label: 'Import', href: '/admin/import' },
    { id: 'workspace/files', label: 'Files', href: '/admin/files' },
    {
      id: 'workspace/databases',
      label: 'Workflow Database',
      href: '/admin/databases',
      keywords: ['database', 'backups', 'operations', 'engine', 'crud', 'preview', 'redis'],
      children: [
        { id: 'workspace/databases/backups', label: 'Backups', href: '/admin/databases/backups', exact: true },
        { id: 'workspace/databases/operations', label: 'Operations', href: '/admin/databases/operations' },
        { id: 'workspace/databases/crud', label: 'CRUD Console', href: '/admin/databases/crud' },
        { id: 'workspace/databases/control-panel', label: 'Control Panel', href: '/admin/databases/control-panel' },
        { id: 'workspace/databases/preview', label: 'Database Preview', href: '/admin/databases/preview' },
        { id: 'workspace/databases/redis', label: 'Redis', href: '/admin/databases/engine?view=redis' },
        { id: 'workspace/databases/engine', label: 'Database Engine', href: '/admin/databases/engine' },
      ],
    },
    { id: 'workspace/app-embeds', label: 'App Embeds', href: '/admin/app-embeds' },
  ],
});
