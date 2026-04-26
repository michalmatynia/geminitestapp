import React from 'react';
import { type NavItem } from './admin-menu-utils';
import { HomeIcon, AppWindow, GraduationCapIcon, Plug } from './icons';

export const getWorkspaceNav = (): NavItem => ({
  id: 'workspace',
  label: 'Workspace',
  icon: <AppWindow className='size-4' />,
  children: [
    { id: 'workspace/front-manage', label: 'Front Manage', href: '/admin/front-manage' },
    {
      id: 'workspace/kangur',
      label: 'Kangur',
      href: '/admin/kangur',
      icon: <GraduationCapIcon className='size-4' />,
      keywords: ['math', 'education', 'training', 'game', 'competition'],
      children: [
        { id: 'workspace/kangur/studio', label: 'Studio', href: '/admin/kangur', exact: true },
        { id: 'workspace/kangur/builder', label: 'CMS Builder', href: '/admin/kangur/builder' },
        { id: 'workspace/kangur/lessons-manager', label: 'Lessons Manager', href: '/admin/kangur/lessons-manager' },
        { id: 'workspace/kangur/observability', label: 'Observability', href: '/admin/kangur/observability' },
        { id: 'workspace/kangur/social', label: 'Social', href: '/admin/kangur/social', keywords: ['linkedin', 'social', 'posts', 'updates'] },
        { id: 'workspace/kangur/appearance', label: 'Appearance', href: '/admin/kangur/appearance', keywords: ['theme', 'theming', 'styling', 'brand'] },
        { id: 'workspace/kangur/settings', label: 'Settings', href: '/admin/kangur/settings' },
        { id: 'workspace/kangur/settings/ai-tutor-content', label: 'AI Tutor Content', href: '/admin/kangur/settings/ai-tutor-content', required: true },
      ],
    },
    { id: 'workspace/import', label: 'Import', href: '/admin/import' },
    { id: 'workspace/files', label: 'Files', href: '/admin/files' },
    {
      id: 'workspace/databases',
      label: 'Workflow Database',
      href: '/admin/databases/engine',
      keywords: ['database', 'backups', 'operations', 'engine'],
      children: [
        { id: 'workspace/databases/backups', label: 'Backups', href: '/admin/databases/engine?view=backups', exact: true },
        { id: 'workspace/databases/operations', label: 'Operations', href: '/admin/databases/engine?view=operations' },
        { id: 'workspace/databases/engine', label: 'Database Engine', href: '/admin/databases/engine' },
      ],
    },
    { id: 'workspace/app-embeds', label: 'App Embeds', href: '/admin/app-embeds' },
  ],
});
