import { NavigationCard, NavigationCardGrid, SectionHeader } from '@/shared/ui';

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

      <NavigationCardGrid className='sm:grid-cols-2 lg:grid-cols-3'>
        {cards.map((card: { title: string; description: string; href: string }) => (
          <NavigationCard
            key={card.title}
            href={card.href}
            title={card.title}
            description={card.description}
            className='hover:bg-muted/60'
            padding='none'
            contentClassName='p-6'
          />
        ))}
      </NavigationCardGrid>
    </div>
  );
}
