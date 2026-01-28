"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import { useEffect, useMemo, useState } from "react";




import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  type AuthRole,
  type AuthUserRoleMap,
} from "@/features/auth/utils/auth-management";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import type { AuthUserSummary } from "@/features/auth/types";
import { fetchAuthUsers } from "@/features/auth/api/users";

export default function AuthDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AuthUserSummary[]>([]);
  const [provider, setProvider] = useState<"prisma" | "mongodb">("prisma");
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);
  const [userRoles, setUserRoles] = useState<AuthUserRoleMap>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [usersPayload, settingsRes] = await Promise.all([
          fetchAuthUsers(),
          fetch("/api/settings"),
        ]);
        setUsers(usersPayload.users ?? []);
        setProvider(usersPayload.provider ?? "prisma");

        if (settingsRes.ok) {
          const settings = (await settingsRes.json()) as Array<{ key: string; value: string }>;
          const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
          const storedRoles = mergeDefaultRoles(
            parseJsonSetting<AuthRole[]>(
              settingsMap.get(AUTH_SETTINGS_KEYS.roles),
              DEFAULT_AUTH_ROLES
            )
          );
          const storedUserRoles = parseJsonSetting<AuthUserRoleMap>(
            settingsMap.get(AUTH_SETTINGS_KEYS.userRoles),
            {}
          );
          setRoles(storedRoles);
          setUserRoles(storedUserRoles);
        }
      } catch (error) {
        console.error("Failed to load auth dashboard data:", error);
        toast("Failed to load auth dashboard data", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  const metrics = useMemo(() => {
    const total = users.length;
    const verified = users.filter((user) => Boolean(user.emailVerified)).length;
    const unverified = total - verified;
    const roleCounts = roles.reduce<Record<string, number>>((acc, role) => {
      acc[role.id] = 0;
      return acc;
    }, {});
    let unassigned = 0;
    users.forEach((user) => {
      const assignedRole = userRoles[user.id];
      if (assignedRole && roleCounts[assignedRole] !== undefined) {
        roleCounts[assignedRole] += 1;
      } else {
        unassigned += 1;
      }
    });
    return { total, verified, unverified, roleCounts, unassigned };
  }, [roles, userRoles, users]);

  if (loading) {
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
          {roles.map((role) => (
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
