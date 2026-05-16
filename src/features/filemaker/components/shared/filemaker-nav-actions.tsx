import {
  BotMessageSquare,
  BriefcaseBusiness,
  Building2,
  BookOpen,
  CalendarDays,
  Database,
  Globe,
  Mail,
  Megaphone,
  FileText,
  Share2,
  ShieldAlert,
  ShieldOff,
  Tags,
  Users,
} from 'lucide-react';

import type { PanelAction } from '@/shared/contracts/ui/panels';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReactNode } from 'react';
import { startTransition } from 'react';

type FilemakerPageKey =
  | 'persons'
  | 'organizations'
  | 'emails'
  | 'invoices'
  | 'job-listings'
  | 'websites'
  | 'mail'
  | 'email-dashboard'
  | 'mail-settings'
  | 'events'
  | 'values'
  | 'lexicon'
  | 'campaigns'
  | 'control-centre'
  | 'suppressions'
  | 'social'
  | 'goal-automation'
  | 'manage';

const NAV_ITEMS: Array<{
  key: FilemakerPageKey;
  label: string;
  href: string;
  icon: ReactNode;
  variant?: PanelAction['variant'];
}> = [
  {
    key: 'persons',
    label: 'Persons',
    href: '/admin/filemaker/persons',
    icon: <Users className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'organizations',
    label: 'Organizations',
    href: '/admin/filemaker/organizations',
    icon: <Building2 className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'emails',
    label: 'Email Records',
    href: '/admin/filemaker/emails',
    icon: <Mail className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    href: '/admin/filemaker/invoices',
    icon: <FileText className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'job-listings',
    label: 'Job Listings',
    href: '/admin/filemaker/job-listings',
    icon: <BriefcaseBusiness className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'websites',
    label: 'Websites',
    href: '/admin/filemaker/websites',
    icon: <Globe className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'mail',
    label: 'Email Client',
    href: '/admin/filemaker/mail-client',
    icon: <Mail className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'email-dashboard',
    label: 'Email Dashboard',
    href: '/admin/filemaker/email-dashboard',
    icon: <Mail className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'events',
    label: 'Events',
    href: '/admin/filemaker/events',
    icon: <CalendarDays className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'values',
    label: 'Values',
    href: '/admin/filemaker/values',
    icon: <Tags className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'lexicon',
    label: 'Lexicon',
    href: '/admin/filemaker/lexicon',
    icon: <BookOpen className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'campaigns',
    label: 'Email Campaigns',
    href: '/admin/filemaker/campaigns',
    icon: <Megaphone className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'control-centre',
    label: 'Control Centre',
    href: '/admin/filemaker/campaigns/control-centre',
    icon: <ShieldAlert className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'suppressions',
    label: 'Suppressions',
    href: '/admin/filemaker/campaigns/suppressions',
    icon: <ShieldOff className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'social',
    label: 'Social Publishing',
    href: '/admin/filemaker/social',
    icon: <Share2 className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'goal-automation',
    label: 'Goal Automation',
    href: '/admin/filemaker/goal-automation',
    icon: <BotMessageSquare className='size-4' />,
    variant: 'outline',
  },
  {
    key: 'manage',
    label: 'Manage Database',
    href: '/admin/filemaker',
    icon: <Database className='size-4' />,
  },
];

export function buildFilemakerNavActions(
  router: AppRouterInstance,
  currentPage: FilemakerPageKey
): PanelAction[] {
  return NAV_ITEMS.filter((item) => item.key !== currentPage).map((item) => {
    const action: PanelAction = {
      key: item.key,
      label: item.label,
      icon: item.icon,
      onClick: () => startTransition(() => { router.push(item.href); }),
    };

    if (item.variant !== undefined) {
      action.variant = item.variant;
    }

    return action;
  });
}
