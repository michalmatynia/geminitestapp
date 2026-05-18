/* eslint-disable max-lines-per-function */

import {
  StickyNoteIcon,
  SettingsIcon,
  MapIcon,
  BarChart3Icon,
  ActivityIcon,
  ShieldIcon,
  AppWindow,
  GraduationCapIcon,
  PackageIcon,
  ImageIcon,
} from './icons';
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
      children: [
        { id: 'content/notes/notebooks', label: 'Notebooks', href: '/admin/notes/notebooks' },
        { id: 'content/notes/tags', label: 'Tags', href: '/admin/notes/tags' },
        { id: 'content/notes/themes', label: 'Themes', href: '/admin/notes/themes' },
        { id: 'content/notes/settings', label: 'Settings', href: '/admin/notes/settings' },
      ],
    },
    {
      id: 'content/cms',
      label: 'CMS',
      href: '/admin/cms',
      children: [
        { id: 'content/cms/pages', label: 'Pages', href: '/admin/cms/pages' },
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
        { id: 'content/cms/slugs', label: 'Slugs', href: '/admin/cms/slugs' },
        { id: 'content/cms/slugs/create', label: 'Create Slug', href: '/admin/cms/slugs/create' },
        { id: 'content/cms/themes', label: 'Themes', href: '/admin/cms/themes' },
        { id: 'content/cms/themes/create', label: 'Create Theme', href: '/admin/cms/themes/create' },
        { id: 'content/cms/zones', label: 'Zones', href: '/admin/cms/zones' },
      ],
    },
  ],
});

export const getPageManagerNav = (): NavItem => ({
  id: 'page-manager',
  label: 'Page Manager',
  href: '/admin/page-manager',
  icon: <AppWindow className='size-4' />,
  keywords: ['pages', 'cms', 'website', 'project pages'],
  children: [
    {
      id: 'page-manager/studiq',
      label: 'StudiQ',
      href: '/admin/page-manager/studiq',
      icon: <GraduationCapIcon className='size-4' />,
      keywords: ['kangur', 'math', 'education', 'training', 'game', 'competition'],
      children: [
        {
          id: 'page-manager/studiq/studio',
          label: 'Studio',
          href: '/admin/page-manager/studiq',
          exact: true,
        },
        {
          id: 'page-manager/studiq/builder',
          label: 'CMS Builder',
          href: '/admin/page-manager/studiq/builder',
        },
        {
          id: 'page-manager/studiq/lessons-manager',
          label: 'Lessons Manager',
          href: '/admin/page-manager/studiq/lessons-manager',
        },
        {
          id: 'page-manager/studiq/observability',
          label: 'Observability',
          href: '/admin/page-manager/studiq/observability',
        },
        {
          id: 'page-manager/studiq/appearance',
          label: 'Appearance',
          href: '/admin/page-manager/studiq/appearance',
          keywords: ['theme', 'theming', 'styling', 'brand'],
        },
        {
          id: 'page-manager/studiq/settings',
          label: 'Settings',
          href: '/admin/page-manager/studiq/settings',
        },
        {
          id: 'page-manager/studiq/settings/ai-tutor-content',
          label: 'AI Tutor Content',
          href: '/admin/page-manager/studiq/settings/ai-tutor-content',
          required: true,
        },
        {
          id: 'page-manager/studiq/database',
          label: 'Database',
          href: '/admin/kangur/database',
          keywords: ['push', 'sync', 'cloud', 'mongodb', 'mirror'],
        },
      ],
    },
    {
      id: 'page-manager/kangur',
      label: 'Kangur',
      href: '/admin/kangur',
      icon: <GraduationCapIcon className='size-4' />,
      keywords: ['kangur', 'math', 'education', 'training', 'competition'],
      children: [
        { id: 'page-manager/kangur/builder', label: 'Builder', href: '/admin/kangur/builder' },
        { id: 'page-manager/kangur/content-manager', label: 'Content Manager', href: '/admin/kangur/content-manager' },
        { id: 'page-manager/kangur/lessons-manager', label: 'Lessons Manager', href: '/admin/kangur/lessons-manager' },
        { id: 'page-manager/kangur/tests-manager', label: 'Tests Manager', href: '/admin/kangur/tests-manager' },
        { id: 'page-manager/kangur/documentation', label: 'Documentation', href: '/admin/kangur/documentation' },
        { id: 'page-manager/kangur/observability', label: 'Observability', href: '/admin/kangur/observability' },
        { id: 'page-manager/kangur/appearance', label: 'Appearance', href: '/admin/kangur/appearance' },
        { id: 'page-manager/kangur/settings', label: 'Settings', href: '/admin/kangur/settings' },
        { id: 'page-manager/kangur/settings/ai-tutor-content', label: 'AI Tutor Content', href: '/admin/kangur/settings/ai-tutor-content' },
        { id: 'page-manager/kangur/database', label: 'Database', href: '/admin/kangur/database', keywords: ['push', 'sync', 'cloud', 'mongodb', 'mirror'] },
      ],
    },
    {
      id: 'page-manager/stargater',
      label: 'Stargater',
      href: '/admin/page-manager/stargater',
      icon: <PackageIcon className='size-4' />,
      keywords: ['ecommerce', 'storefront', 'products pages'],
    },
    {
      id: 'page-manager/milkbardesigners',
      label: 'Milkbardesigners',
      href: '/admin/page-manager/milkbardesigners',
      icon: <ImageIcon className='size-4' />,
      keywords: ['milkbar', 'architecture', 'arch web'],
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
    { id: 'system/settings/ai', label: 'AI Settings', href: '/admin/settings/ai' },
    { id: 'system/settings/brain', label: 'Brain Settings', href: '/admin/settings/brain' },
    { id: 'system/settings/folder-trees', label: 'Folder Trees', href: '/admin/settings/folder-trees' },
    { id: 'system/settings/menu', label: 'Menu', href: '/admin/settings/menu' },
    { id: 'system/settings/notifications', label: 'Notifications', href: '/admin/settings/notifications' },
    { id: 'system/settings/playwright', label: 'Playwright', href: '/admin/settings/playwright' },
    { id: 'system/settings/playwright-ai', label: 'Playwright AI', href: '/admin/settings/playwright-ai' },
    { id: 'system/settings/recovery', label: 'Recovery', href: '/admin/settings/recovery' },
    { id: 'system/settings/scanner', label: 'Scanner', href: '/admin/settings/scanner' },
    { id: 'system/settings/storage', label: 'Storage', href: '/admin/settings/storage' },
    { id: 'system/settings/sync', label: 'Sync', href: '/admin/settings/sync' },
    { id: 'system/settings/typography', label: 'Typography', href: '/admin/settings/typography' },
    { id: 'system/settings/filemaker', label: 'Filemaker', href: '/admin/settings/filemaker', icon: <SettingsIcon className='size-4' /> },
    { id: 'system/settings/filemaker-invoice-pdf', label: 'Invoice PDF', href: '/admin/settings/filemaker-invoice-pdf', icon: <FileText className='size-4' /> },
    { id: 'system/routes', label: 'Route Map', href: '/admin/routes', icon: <MapIcon className='size-4' /> },
    { id: 'system/analytics', label: 'Analytics', href: '/admin/system/analytics', icon: <BarChart3Icon className='size-4' /> },
    { id: 'system/logs', label: 'System Logs', href: '/admin/system/logs', icon: <ActivityIcon className='size-4' /> },
    {
      id: 'system/auth',
      label: 'Auth',
      href: '/admin/auth',
      icon: <ShieldIcon className='size-4' />,
      children: [
        { id: 'system/auth/dashboard', label: 'Dashboard', href: '/admin/auth/dashboard' },
        { id: 'system/auth/users', label: 'Users', href: '/admin/auth/users' },
        { id: 'system/auth/user-pages', label: 'User Pages', href: '/admin/auth/user-pages' },
        { id: 'system/auth/permissions', label: 'Permissions', href: '/admin/auth/permissions' },
        { id: 'system/auth/login-activity', label: 'Login Activity', href: '/admin/auth/login-activity' },
        { id: 'system/auth/settings', label: 'Settings', href: '/admin/auth/settings' },
      ],
    },
    {
      id: 'system/validator',
      label: 'Validator',
      href: '/admin/validator',
      children: [
        { id: 'system/validator/lists', label: 'Lists', href: '/admin/validator/lists' },
      ],
    },
  ],
});
