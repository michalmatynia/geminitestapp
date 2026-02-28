'use client';

import Link from 'next/link';

import { SectionHeader, Card, CardHeader, CardTitle, CardDescription } from '@/shared/ui';

const cards = [
  {
    title: 'Dashboard',
    description: 'Overview of auth activity, sign-ins, and health.',
    href: '/admin/auth/dashboard',
  },
  {
    title: 'Users',
    description: 'Manage users, profiles, and account states.',
    href: '/admin/auth/users',
  },
  {
    title: 'Permissions',
    description: 'Roles, policies, and access controls.',
    href: '/admin/auth/permissions',
  },
  {
    title: 'Settings',
    description: 'Providers, sessions, and security settings.',
    href: '/admin/auth/settings',
  },
  {
    title: 'User Pages',
    description: 'Login, signup, and account flows.',
    href: '/admin/auth/user-pages',
  },
];

export default function AuthPage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Auth'
        description='Start building your authentication system.'
        className='mb-6'
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {cards.map((card: { title: string; description: string; href: string }) => (
          <Link key={card.title} href={card.href}>
            <Card className='h-full transition hover:bg-muted/60'>
              <CardHeader>
                <CardTitle className='text-lg font-semibold text-white'>{card.title}</CardTitle>
                <CardDescription className='mt-1 text-sm text-gray-400'>
                  {card.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
