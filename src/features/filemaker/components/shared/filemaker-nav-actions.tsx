import { Building2, CalendarDays, Database, Mail, Users } from 'lucide-react';


import type { PanelAction } from '@/shared/contracts/ui';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReactNode } from 'react';

type FilemakerPageKey = 'persons' | 'organizations' | 'emails' | 'events' | 'manage';

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
    label: 'Emails',
    href: '/admin/filemaker/emails',
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
  return NAV_ITEMS.filter((item) => item.key !== currentPage).map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    ...(item.variant ? { variant: item.variant } : {}),
    onClick: () => router.push(item.href),
  }));
}
