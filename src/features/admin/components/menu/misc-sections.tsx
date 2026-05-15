import { BookOpenIcon, ImageIcon, SparklesIcon } from './icons';
import { type NavItem } from './admin-menu-utils';
import React from 'react';

const FILEMAKER_NAV_CHILDREN: NavItem[] = [
  { id: 'filemaker/database', label: 'Database', href: '/admin/filemaker', exact: true },
  { id: 'filemaker/persons', label: 'Persons', href: '/admin/filemaker/persons' },
  { id: 'filemaker/organizations', label: 'Organizations', href: '/admin/filemaker/organizations' },
  { id: 'filemaker/invoices', label: 'Invoices', href: '/admin/filemaker/invoices' },
  { id: 'filemaker/job-listings', label: 'Job Listings', href: '/admin/filemaker/job-listings' },
  { id: 'filemaker/websites', label: 'Websites', href: '/admin/filemaker/websites' },
  { id: 'filemaker/events', label: 'Events', href: '/admin/filemaker/events' },
  { id: 'filemaker/values', label: 'Values', href: '/admin/filemaker/values' },
  { id: 'filemaker/lexicon', label: 'Lexicon', href: '/admin/filemaker/lexicon' },
  {
    id: 'filemaker/goal-automation',
    label: 'Goal Automation',
    href: '/admin/filemaker/goal-automation',
    keywords: ['goals', 'automation', 'ai goals', 'filemaker automation'],
  },
  { id: 'filemaker/mail-client', label: 'Email Client', href: '/admin/filemaker/mail-client' },
  {
    id: 'filemaker/mail',
    label: 'Mail Settings',
    href: '/admin/filemaker/mail',
    keywords: ['mailbox settings', 'imap', 'smtp', 'mail accounts', 'mail folders'],
  },
  {
    id: 'filemaker/mail/compose',
    label: 'Compose Email',
    href: '/admin/filemaker/mail/compose',
    keywords: ['email composer', 'mail compose', 'one off email'],
  },
  {
    id: 'filemaker/campaigns/create',
    label: 'Email Creator',
    href: '/admin/filemaker/campaigns/create',
    keywords: ['campaign creator', 'email builder', 'newsletter creator', 'new campaign'],
  },
  {
    id: 'filemaker/campaigns',
    label: 'Email Campaigns',
    href: '/admin/filemaker/campaigns',
    keywords: ['campaigns', 'email builder', 'newsletter', 'email creator'],
  },
  {
    id: 'filemaker/campaigns/control-centre',
    label: 'Campaign Control',
    href: '/admin/filemaker/campaigns/control-centre',
    keywords: ['campaign delivery', 'campaign runs', 'email control centre'],
  },
  {
    id: 'filemaker/campaigns/suppressions',
    label: 'Suppressions',
    href: '/admin/filemaker/campaigns/suppressions',
    keywords: ['blocked emails', 'unsubscribed', 'suppression list'],
  },
  { id: 'filemaker/social', label: 'Social Publishing', href: '/admin/filemaker/social', keywords: ['linkedin', 'social', 'posts', 'publishing'] },
  { id: 'filemaker/emails', label: 'Email Records', href: '/admin/filemaker/emails' },
  { id: 'filemaker/list', label: 'Combined List', href: '/admin/filemaker/list' },
  { id: 'filemaker/settings', label: 'Settings', href: '/admin/settings/filemaker' },
];

export const getFilemakerNav = (): NavItem => ({
  id: 'filemaker',
  label: 'Filemaker',
  href: '/admin/filemaker',
  icon: <BookOpenIcon className='size-4' />,
  children: FILEMAKER_NAV_CHILDREN,
});

export const getImageStudioNav = (): NavItem => ({
  id: 'image-studio',
  label: 'Image Studio',
  href: '/admin/image-studio',
  icon: <ImageIcon className='size-4' />,
  children: [
    { id: 'image-studio/projects', label: 'Projects', href: '/admin/image-studio', exact: true },
    { id: 'image-studio/ui-presets', label: 'UI Presets', href: '/admin/image-studio/ui-presets' },
  ],
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
