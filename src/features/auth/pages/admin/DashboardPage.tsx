'use client';

import React, { useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthUsers } from '@/features/auth/hooks/useAuthQueries';
import type { AuthRole } from '@/features/auth/utils/auth-management';
import type { AuthUser as AuthUserSummary } from '@/shared/contracts/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, useToast, Alert } from '@/shared/ui/primitives.public';
import { SectionHeader, MetadataItem, LoadingState, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface Metrics {
  total: number;
  verified: number;
  unverified: number;
  roleCounts: Record<string, number>;
  unassigned: number;
}

const useAuthMetrics = (users: AuthUserSummary[], roles: AuthRole[], userRoles: Record<string, string>): Metrics => {
  return useMemo(() => {
    const total = users.length;
    const verified = users.filter((user) => Boolean(user.emailVerified)).length;
    const unverified = total - verified;
    const initialRoleCounts = roles.reduce<Record<string, number>>(
      (acc, role) => ({ ...acc, [role.id]: 0 }),
      {}
    );
    let unassigned = 0;
    users.forEach((user) => {
      const assignedRole = userRoles[user.id];
      if (assignedRole !== undefined && assignedRole !== '' && initialRoleCounts[assignedRole] !== undefined) {
        initialRoleCounts[assignedRole] += 1;
      } else {
        unassigned += 1;
      }
    });
    return { total, verified, unverified, roleCounts: initialRoleCounts, unassigned };
  }, [roles, userRoles, users]);
};

const MetricsGrid = ({ metrics }: { metrics: Metrics }): React.JSX.Element => (
  <div className={`${UI_GRID_RELAXED_CLASSNAME} sm:grid-cols-2 lg:grid-cols-4`}>
    <MetadataItem
      label='Total Users'
      hint='All accounts'
      value={String(metrics.total)}
      valueClassName='text-3xl font-semibold text-white'
      className='p-4'
    />
    <MetadataItem
      label='Verified Emails'
      hint='Email verified'
      value={String(metrics.verified)}
      valueClassName='text-3xl font-semibold text-white'
      className='p-4'
    />
    <MetadataItem
      label='Unverified'
      hint='Pending verification'
      value={String(metrics.unverified)}
      valueClassName='text-3xl font-semibold text-white'
      className='p-4'
    />
    <MetadataItem
      label='Unassigned Roles'
      hint='No role assigned'
      value={String(metrics.unassigned)}
      valueClassName='text-3xl font-semibold text-white'
      className='p-4'
    />
  </div>
);

const RoleDistribution = ({ roles, roleCounts }: { roles: AuthRole[]; roleCounts: Record<string, number> }): React.JSX.Element => (
  <Card className='bg-card border-border'>
    <CardHeader>
      <CardTitle className='text-white text-lg'>Role Distribution</CardTitle>
      <CardDescription className='text-gray-500'>Users assigned to each role.</CardDescription>
    </CardHeader>
    <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {roles.map((role) => (
        <MetadataItem
          key={role.id}
          label={role.name}
          hint={role.description ?? role.id}
          value={String(roleCounts[role.id] ?? 0)}
          valueClassName='text-2xl font-semibold text-white'
          className='p-4 bg-card/50'
        />
      ))}
    </CardContent>
  </Card>
);

export default function AuthDashboardPage(): React.JSX.Element {
  const { toast } = useToast();
  const { roles, userRoles, canReadUsers, isLoading: authLoading } = useAuth();

  const authUsersQuery = useAuthUsers(canReadUsers);

  useEffect(() => {
    if (authUsersQuery.error === null || !canReadUsers) return;
    logClientError(authUsersQuery.error, {
      context: { source: 'AuthDashboardPage', action: 'loadMetrics' },
    });
    toast('Failed to load auth dashboard data', { variant: 'error' });
  }, [authUsersQuery.error, toast, canReadUsers]);

  const users = useMemo<AuthUserSummary[]>(
    () => (canReadUsers ? (authUsersQuery.data?.users ?? []) : []),
    [authUsersQuery.data?.users, canReadUsers]
  );
  const provider = authUsersQuery.data?.provider ?? 'mongodb';
  const metrics = useAuthMetrics(users, roles, userRoles);

  if (!canReadUsers) {
    return (
      <div className='page-section'>
        <Alert variant='warning' className='p-6 text-sm'>
          You don&apos;t have permission to view auth metrics. Ask an admin to grant
          `auth.users.read` or elevate your account.
        </Alert>
      </div>
    );
  }

  if (authUsersQuery.isPending || authLoading) {
    return (
      <div className='page-section'>
        <Card variant='glass' padding='lg' className='flex justify-center'>
          <LoadingState message='Loading auth metrics...' />
        </Card>
      </div>
    );
  }

  return (
    <div className='page-section max-w-5xl space-y-6'>
      <Card variant='glass' padding='lg'>
        <SectionHeader
          title='Auth Dashboard'
          description={`Overview of user accounts and role assignments (provider: ${provider}).`}
        />
      </Card>

      <MetricsGrid metrics={metrics} />
      <RoleDistribution roles={roles} roleCounts={metrics.roleCounts} />
    </div>
  );
}
