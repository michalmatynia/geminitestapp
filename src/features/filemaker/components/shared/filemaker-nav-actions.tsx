import { Building2, CalendarDays, Database, Mail, Megaphone, ShieldAlert, ShieldOff, Users } from 'lucide-react';


import type { PanelAction } from '@/shared/contracts/ui/panels';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReactNode } from 'react';
import { startTransition } from 'react';

type FilemakerPageKey =
  | 'persons'
  | 'organizations'
  | 'emails'
  | 'mail'
  | 'events'
  | 'campaigns'
  | 'control-centre'
  | 'suppressions'
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
    key: 'mail',
    label: 'Email Client',
    href: '/admin/filemaker/mail-client',
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
    key: 'campaigns',
    label: 'Campaigns',
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
