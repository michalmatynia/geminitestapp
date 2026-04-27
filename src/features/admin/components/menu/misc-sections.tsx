import { BookOpenIcon, ImageIcon, SparklesIcon } from './icons';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

export const getFilemakerNav = (): NavItem => ({
  id: 'filemaker',
  label: 'Filemaker',
  href: '/admin/filemaker',
  icon: <BookOpenIcon className='size-4' />,
  children: [
    { id: 'filemaker/database', label: 'Database', href: '/admin/filemaker', exact: true },
    { id: 'filemaker/persons', label: 'Persons', href: '/admin/filemaker/persons' },
    { id: 'filemaker/organizations', label: 'Organizations', href: '/admin/filemaker/organizations' },
    { id: 'filemaker/invoices', label: 'Invoices', href: '/admin/filemaker/invoices' },
    { id: 'filemaker/events', label: 'Events', href: '/admin/filemaker/events' },
    { id: 'filemaker/values', label: 'Values', href: '/admin/filemaker/values' },
    { id: 'filemaker/mail-client', label: 'Email Client', href: '/admin/filemaker/mail-client' },
    { id: 'filemaker/emails', label: 'Email Records', href: '/admin/filemaker/emails' },
    { id: 'filemaker/list', label: 'Combined List', href: '/admin/filemaker/list' },
  ],
});

export const getImageStudioNav = (): NavItem => ({
  id: 'image-studio',
  label: 'Image Studio',
  href: '/admin/image-studio',
  icon: <ImageIcon className='size-4' />,
});

export const getPromptExploderNav = (): NavItem => ({
  id: 'prompt-exploder',
  label: 'Prompt Exploder',
  href: '/admin/prompt-exploder',
  icon: <SparklesIcon className='size-4' />,
  children: [
    { id: 'prompt-exploder/projects', label: 'Projects', href: '/admin/prompt-exploder/projects' },
    { id: 'prompt-exploder/settings', label: 'Settings', href: '/admin/prompt-exploder/settings' },
  ],
});
