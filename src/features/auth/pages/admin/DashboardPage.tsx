'use client';

import React, { useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthUsers } from '@/features/auth/hooks/useAuthQueries';
import type { AuthUserSummary } from '@/features/auth/types';
import type { AuthRole } from '@/features/auth/utils/auth-management';
import { logClientError } from '@/features/observability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, useToast, SectionHeader, SectionPanel } from '@/shared/ui';

export default function AuthDashboardPage(): React.JSX.Element {
  const { toast } = useToast();
  const {
    roles,
    userRoles,
    canReadUsers,
    isLoading: authLoading,
  } = useAuth();

  const authUsersQuery = useAuthUsers(canReadUsers);

  useEffect(() => {
    if (!authUsersQuery.error || !canReadUsers) return;
    logClientError(authUsersQuery.error, { context: { source: 'AuthDashboardPage', action: 'loadMetrics' } });
    toast('Failed to load auth dashboard data', { variant: 'error' });
  }, [authUsersQuery.error, toast, canReadUsers]);

  const users = useMemo<AuthUserSummary[]>(
    () => (canReadUsers ? authUsersQuery.data?.users ?? [] : []),
    [authUsersQuery.data?.users, canReadUsers]
  );
  const provider = authUsersQuery.data?.provider ?? 'mongodb';

  const metrics = useMemo(() => {
    const total = users.length;
    const verified = users.filter((user: AuthUserSummary) => Boolean(user.emailVerified)).length;
    const unverified = total - verified;
    const roleCounts = roles.reduce<Record<string, number>>((acc: Record<string, number>, role: AuthRole) => {
      acc[role.id] = 0;
      return acc;
    }, {});
    let unassigned = 0;
    users.forEach((user: AuthUserSummary) => {
      const assignedRole = userRoles[user.id];
      if (assignedRole && roleCounts[assignedRole] !== undefined) {
        roleCounts[assignedRole] += 1;
      } else {
        unassigned += 1;
      }
    });
    return { total, verified, unverified, roleCounts, unassigned };
  }, [roles, userRoles, users]);

  if (!canReadUsers) {
    return (
      <SectionPanel className="p-6 text-sm text-amber-300">
        You don&apos;t have permission to view auth metrics. Ask an admin to grant
        `auth.users.read` or elevate your account.
      </SectionPanel>
    );
  }

  if (authUsersQuery.isPending || authLoading) {
    return (
      <SectionPanel className="p-6 text-sm text-gray-400">
        Loading auth metrics...
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-6">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Auth Dashboard"
          description={`Overview of user accounts and role assignments (provider: ${provider}).`}
        />
      </SectionPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-lg">Total Users</CardTitle>
            <CardDescription className="text-gray-500">All accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-white">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-lg">Verified Emails</CardTitle>
            <CardDescription className="text-gray-500">Email verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-white">{metrics.verified}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-lg">Unverified</CardTitle>
            <CardDescription className="text-gray-500">Pending verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-white">{metrics.unverified}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-lg">Unassigned Roles</CardTitle>
            <CardDescription className="text-gray-500">No role assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-white">{metrics.unassigned}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg">Role Distribution</CardTitle>
          <CardDescription className="text-gray-500">
            Users assigned to each role.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role: AuthRole) => (
            <div
              key={role.id}
              className="rounded-md border border-border bg-card/50 px-4 py-3"
            >
              <div className="text-sm font-semibold text-white">{role.name}</div>
              <div className="text-xs text-gray-400">{role.description ?? role.id}</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {metrics.roleCounts[role.id] ?? 0}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
