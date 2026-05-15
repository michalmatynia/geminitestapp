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
    { id: 'system/settings/filemaker', label: 'Filemaker', href: '/admin/settings/filemaker', icon: <SettingsIcon className='size-4' /> },
    { id: 'system/settings/filemaker-invoice-pdf', label: 'Invoice PDF', href: '/admin/settings/filemaker-invoice-pdf', icon: <FileText className='size-4' /> },
    { id: 'system/routes', label: 'Route Map', href: '/admin/routes', icon: <MapIcon className='size-4' /> },
    { id: 'system/analytics', label: 'Analytics', href: '/admin/system/analytics', icon: <BarChart3Icon className='size-4' /> },
    { id: 'system/logs', label: 'System Logs', href: '/admin/system/logs', icon: <ActivityIcon className='size-4' /> },
    { id: 'system/auth', label: 'Auth', href: '/admin/auth', icon: <ShieldIcon className='size-4' /> },
  ],
});
