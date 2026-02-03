"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, ListPanel, SectionHeader, SectionPanel, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast, Textarea, Checkbox, Badge } from "@/shared/ui";
import { logClientError } from "@/features/observability";
import { useSession } from "next-auth/react";

import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  type AuthRole,
  type AuthUserRoleMap,
} from "@/features/auth/utils/auth-management";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { DEFAULT_AUTH_SECURITY_POLICY } from "@/features/auth/utils/auth-security";
import type { AuthUserSummary } from "@/features/auth/types";

import {
  useAuthUsers,
  useAuthUserSecurity,
  useMockSignIn,
  useRegisterUser,
  useUpdateAuthUser,
  useUpdateAuthUserSecurity,
} from "@/features/auth/hooks/useAuthQueries";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";

type CreateUserForm = typeof EMPTY_CREATE;

const EMPTY_CREATE = { name: "", email: "", password: "", roleId: "none", verified: false };

export default function AuthUsersPage(): React.JSX.Element {
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUserSummary[]>([]);
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);
  const [userRoles, setUserRoles] = useState<AuthUserRoleMap>({});
  const [search, setSearch] = useState("");
  const [dirtyRoles, setDirtyRoles] = useState(false);

  const [editingUser, setEditingUser] = useState<AuthUserSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editDisabled, setEditDisabled] = useState(false);
  const [editBanned, setEditBanned] = useState(false);
  const [editAllowedIps, setEditAllowedIps] = useState("");
  const [editMfaEnabled, setEditMfaEnabled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);

  const [mockEmail, setMockEmail] = useState("");
  const [mockPassword, setMockPassword] = useState("");
  const [mockStatus, setMockStatus] = useState<"idle" | "success" | "error">("idle");
  const [mockMessage, setMockMessage] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const { data: session } = useSession();
  const canReadUsers = Boolean(
    session?.user?.isElevated || session?.user?.permissions?.includes("auth.users.read")
  );
  const authUsersQuery = useAuthUsers(canReadUsers);
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const updateAuthUserMutation = useUpdateAuthUser();
  const updateAuthUserSecurityMutation = useUpdateAuthUserSecurity();
  const registerUserMutation = useRegisterUser();
  const mockSignInMutation = useMockSignIn();
  const canManageSecurity = Boolean(
    session?.user?.isElevated || session?.user?.permissions?.includes("auth.users.write")
  );
  const userSecurityQuery = useAuthUserSecurity(canManageSecurity ? editingUser?.id : null);
  const loading = (canReadUsers && authUsersQuery.isPending) || settingsQuery.isPending;
  const loadingSecurity = canManageSecurity && userSecurityQuery.isPending;
  const provider = authUsersQuery.data?.provider ?? "mongodb";
  const rolesSettingRaw = settingsQuery.data?.get(AUTH_SETTINGS_KEYS.roles) ?? null;
  const userRolesSettingRaw = settingsQuery.data?.get(AUTH_SETTINGS_KEYS.userRoles) ?? null;

  useEffect(() => {
    if (!authUsersQuery.error || !canReadUsers) return;
    logClientError(authUsersQuery.error, { context: { source: "AuthUsersPage", action: "loadUsers" } });
    toast("Failed to load users", { variant: "error" });
  }, [authUsersQuery.error, toast, canReadUsers]);

  useEffect(() => {
    if (!settingsQuery.error) return;
    logClientError(settingsQuery.error, { context: { source: "AuthUsersPage", action: "loadRoles" } });
    toast("Failed to load user roles", { variant: "error" });
  }, [settingsQuery.error, toast]);

  useEffect(() => {
    if (!userSecurityQuery.error || !canManageSecurity) return;
    logClientError(userSecurityQuery.error, { context: { source: "AuthUsersPage", action: "loadSecurityProfile", userId: editingUser?.id } });
  }, [userSecurityQuery.error, editingUser?.id, canManageSecurity]);

  useEffect(() => {
    if (!canReadUsers) {
      setUsers([]);
      return;
    }
    if (!authUsersQuery.data) return;
    setUsers(authUsersQuery.data.users ?? []);
  }, [authUsersQuery.data, authUsersQuery.dataUpdatedAt, canReadUsers]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const storedRoles = mergeDefaultRoles(
      parseJsonSetting<AuthRole[]>(
        settingsQuery.data.get(AUTH_SETTINGS_KEYS.roles),
        DEFAULT_AUTH_ROLES
      )
    );
    const storedUserRoles = parseJsonSetting<AuthUserRoleMap>(
      settingsQuery.data.get(AUTH_SETTINGS_KEYS.userRoles),
      {}
    );
    setRoles(storedRoles);
    setUserRoles(storedUserRoles);
    setDirtyRoles(false);
  }, [settingsQuery.data, rolesSettingRaw, userRolesSettingRaw]);

  const filteredUsers = useMemo<AuthUserSummary[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user: AuthUserSummary) => {
      return (
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  const handleRoleChange = (userId: string, roleId: string): void => {
    setUserRoles((prev: AuthUserRoleMap) => {
      const next = { ...prev };
      if (!roleId || roleId === "none") {
        delete next[userId];
      } else {
        next[userId] = roleId;
      }
      return next;
    });
    setDirtyRoles(true);
  };

  const handleSaveRoles = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.userRoles,
        value: serializeSetting(userRoles),
      });
      setDirtyRoles(false);
      toast("User roles updated", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AuthUsersPage", action: "saveRoles" } });
      toast("Failed to save user roles", { variant: "error" });
    }
  };

  const handleOpenEdit = (user: AuthUserSummary): void => {
    setEditingUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditVerified(Boolean(user.emailVerified));
    setEditDisabled(false);
    setEditBanned(false);
    setEditAllowedIps("");
    setEditMfaEnabled(false);
  };

  useEffect(() => {
    if (!userSecurityQuery.data || !editingUser) return;
    setEditDisabled(Boolean(userSecurityQuery.data.disabledAt));
    setEditBanned(Boolean(userSecurityQuery.data.bannedAt));
    setEditAllowedIps((userSecurityQuery.data.allowedIps ?? []).join("\n"));
    setEditMfaEnabled(Boolean(userSecurityQuery.data.mfaEnabled));
  }, [userSecurityQuery.data, editingUser]);

  const handleSaveUser = async (): Promise<void> => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      toast("Email is required", { variant: "error" });
      return;
    }
    try {
      const payload: { name?: string | null; email: string | null; emailVerified?: boolean | null } = {
        email: editEmail.trim(),
      };
      if (editName.trim()) {
        payload.name = editName.trim();
      }
      if (editVerified !== Boolean(editingUser.emailVerified)) {
        payload.emailVerified = editVerified;
      }
      const updated = (await updateAuthUserMutation.mutateAsync({
        userId: editingUser.id,
        input: payload,
      }));
      const securityPayload = {
        disabled: editDisabled,
        banned: editBanned,
        allowedIps: editAllowedIps
          .split(/\r?\n|,/)
          .map((entry: string) => entry.trim())
          .filter(Boolean),
      };
      if (canManageSecurity) {
        await updateAuthUserSecurityMutation.mutateAsync({
          userId: editingUser.id,
          input: securityPayload,
        });
      }
      setUsers((prev: AuthUserSummary[]) =>
        prev.map((user: AuthUserSummary) => (user.id === updated.id ? updated : user))
      );
      toast("User updated", { variant: "success" });
      setEditingUser(null);
    } catch (error) {
      logClientError(error, { context: { source: "AuthUsersPage", action: "saveUser", userId: editingUser.id } });
      toast("Failed to update user", { variant: "error" });
    }
  };

  const handleDisableMfa = async (): Promise<void> => {
    if (!editingUser || !canManageSecurity) return;
    try {
      await updateAuthUserSecurityMutation.mutateAsync({
        userId: editingUser.id,
        input: { disableMfa: true },
      });
      setEditMfaEnabled(false);
      toast("MFA disabled for user", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AuthUsersPage", action: "disableMfa", userId: editingUser.id } });
      toast("Failed to disable MFA", { variant: "error" });
    }
  };

  const handleCreateUser = async (): Promise<void> => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      toast("Email and password are required", { variant: "error" });
      return;
    }
    if (createForm.password.trim().length < DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength) {
      toast(`Password must be at least ${DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} characters`, {
        variant: "error",
      });
      return;
    }
    try {
      const registerInput: { email: string; password: string; name?: string } = {
        email: createForm.email.trim(),
        password: createForm.password.trim(),
      };
      const trimmedName: string = createForm.name.trim();
      if (trimmedName) {
        registerInput.name = trimmedName;
      }
      const res = (await registerUserMutation.mutateAsync(registerInput)) as { ok: boolean; payload: { id: string; email: string; name?: string | null; error?: string; details?: { issues?: string[] } } };

      if (!res.ok) {
        const errorPayload = res.payload;
        const details = errorPayload?.details?.issues?.join(" ") ?? "";
        toast(
          errorPayload?.error
            ? `${errorPayload.error}${details ? ` ${details}` : ""}`
            : "Failed to create user",
          { variant: "error" }
        );
        return;
      }
      const created = res.payload;

      if (createForm.roleId && createForm.roleId !== "none") {
        const nextRoles = { ...userRoles, [created.id]: createForm.roleId };
        try {
          await updateSetting.mutateAsync({
            key: AUTH_SETTINGS_KEYS.userRoles,
            value: serializeSetting(nextRoles),
          });
          setUserRoles(nextRoles);
          setDirtyRoles(false);
        } catch (roleError) {
          logClientError(roleError, { context: { source: "AuthUsersPage", action: "assignRoleAfterCreate", userId: created.id, roleId: createForm.roleId } });
        }
      }

      if (createForm.verified) {
        await updateAuthUserMutation.mutateAsync({
          userId: created.id,
          input: { emailVerified: true },
        });
      }

      toast("User created", { variant: "success" });
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      void authUsersQuery.refetch();
    } catch (error) {
      logClientError(error, { context: { source: "AuthUsersPage", action: "createUser" } });
      toast("Failed to create user", { variant: "error" });
    }
  };

  const handleMockSignIn = async (): Promise<void> => {
    if (!mockEmail.trim() || !mockPassword.trim()) {
      setMockStatus("error");
      setMockMessage("Email and password are required.");
      return;
    }
    try {
      setMockStatus("idle");
      setMockMessage("");
      const res = await mockSignInMutation.mutateAsync({
        email: mockEmail.trim(),
        password: mockPassword,
      });
      if (!res.ok) {
        throw new Error("Mock sign-in failed");
      }
      const payload = res.payload as { ok?: boolean; message?: string };
      if (payload.ok) {
        setMockStatus("success");
        setMockMessage(payload.message ?? "Credentials are valid.");
      } else {
        setMockStatus("error");
        setMockMessage(payload.message ?? "Sign-in failed. Check credentials.");
      }
    } catch (error) {
      logClientError(error, { context: { source: "AuthUsersPage", action: "mockSignIn", email: mockEmail } });
      setMockStatus("error");
      setMockMessage("Sign-in failed. Check server logs.");
    }
  };

  if (!canReadUsers) {
    return (
      <SectionPanel className="p-6 text-sm text-amber-300">
        You don&apos;t have permission to view user accounts. Ask an admin to grant
        `auth.users.read` or elevate your account.
      </SectionPanel>
    );
  }

  return (
    <>
      <ListPanel
        header={
          <SectionHeader
            title="Users"
            description={`Manage user accounts and assign roles (provider: ${provider}).`}
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    void authUsersQuery.refetch();
                    void settingsQuery.refetch();
                  }}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => setMockOpen(true)}>
                  Mock Sign-in
                </Button>
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Create User
                </Button>
                <Button
                  onClick={() => void handleSaveRoles()}
                  disabled={!dirtyRoles || updateSetting.isPending}
                >
                  {updateSetting.isPending ? "Saving..." : "Save Roles"}
                </Button>
              </>
            }
          />
        }
        filters={
          <SectionPanel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={search}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Search by name, email, or ID"
                className="h-8 text-sm sm:max-w-xs"
              />
              <div className="text-xs text-gray-500">
                {dirtyRoles ? "Unsaved role changes" : "Roles are up to date"}
              </div>
            </div>
          </SectionPanel>
        }
      >
        {loading ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-gray-400">
            Loading users...
          </div>
        ) : (
          <Table className="text-gray-200">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: AuthUserSummary) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name ?? "Unnamed"}</TableCell>
                    <TableCell className="text-gray-300">{user.email ?? "No email"}</TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="success">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      {(() : React.ReactNode => {
                        const currentRoleId = userRoles[user.id];
                        const isValidRole = currentRoleId && roles.some((r: AuthRole) => r.id === currentRoleId);
                        const selectValue = isValidRole ? currentRoleId : "none";
                        return (
                          <Select
                            value={selectValue}
                            onValueChange={(value: string) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="h-8 bg-gray-900 border text-white">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {roles.map((role: AuthRole) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(user)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs text-gray-300">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditName(event.target.value)}
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="edit-email"
                value={editEmail}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditEmail(event.target.value)}
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-verified"
                checked={editVerified} onCheckedChange={(checked: boolean | "indeterminate") => setEditVerified(Boolean(checked))}
                className="h-4 w-4 rounded border bg-gray-900"
              />
              <Label htmlFor="edit-verified" className="text-xs text-gray-300">
                Email verified
              </Label>
            </div>
            <div className="rounded-md border border-border bg-card/40 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-300">
                Security controls
              </div>
              {loadingSecurity ? (
                <div className="text-xs text-gray-500">Loading security profile...</div>
              ) : null}
              {!canManageSecurity ? (
                <div className="text-xs text-amber-300">
                  You don&apos;t have permission to view or edit security controls.
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-disabled"
                  checked={editDisabled}
                  onCheckedChange={(checked: boolean | "indeterminate") => setEditDisabled(Boolean(checked))}
                  disabled={!canManageSecurity}
                  className="h-4 w-4 rounded border bg-gray-900"
                />
                <Label htmlFor="edit-disabled" className="text-xs text-gray-300">
                  Disable account
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-banned"
                  checked={editBanned}
                  onCheckedChange={(checked: boolean | "indeterminate") => setEditBanned(Boolean(checked))}
                  disabled={!canManageSecurity}
                  className="h-4 w-4 rounded border bg-gray-900"
                />
                <Label htmlFor="edit-banned" className="text-xs text-gray-300">
                  Ban account
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-allowed-ips" className="text-xs text-gray-300">
                  Allowed IPs (optional)
                </Label>
                <Textarea
                  id="edit-allowed-ips"
                  value={editAllowedIps}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setEditAllowedIps(event.target.value)}
                  disabled={!canManageSecurity}
                  className="min-h-[80px] w-full rounded-md border bg-gray-900 px-3 py-2 text-xs text-white"
                  placeholder="One IP per line or comma-separated"
                />
              </div>
              <div className="text-xs text-gray-500">
                MFA status: {editMfaEnabled ? "enabled" : "disabled"}
              </div>
              {editMfaEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDisableMfa()}
                  disabled={!canManageSecurity}
                >
                  Disable MFA
                </Button>
              ) : null}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveUser()}
              disabled={updateAuthUserMutation.isPending || updateAuthUserSecurityMutation.isPending}
            >
              {updateAuthUserMutation.isPending || updateAuthUserSecurityMutation.isPending
                ? "Saving..."
                : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-xs text-gray-300">
                Name
              </Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateUserForm) => ({ ...prev, name: event.target.value }))
                }
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="create-email"
                value={createForm.email}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateUserForm) => ({ ...prev, email: event.target.value }))
                }
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password" className="text-xs text-gray-300">
                Temporary password
              </Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateUserForm) => ({ ...prev, password: event.target.value }))
                }
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role" className="text-xs text-gray-300">
                Role
              </Label>
              <Select
                value={createForm.roleId}
                onValueChange={(value: string) =>
                  setCreateForm((prev: CreateUserForm) => ({ ...prev, roleId: value }))
                }
              >
                <SelectTrigger className="bg-gray-900 border text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {roles.map((role: AuthRole) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-verified"
                checked={createForm.verified} onCheckedChange={(checked: boolean | "indeterminate") =>
                  setCreateForm((prev: CreateUserForm) => ({
                    ...prev,
                    verified: Boolean(checked),
                  }))
                }
                className="h-4 w-4 rounded border bg-gray-900"
              />
              <Label htmlFor="create-verified" className="text-xs text-gray-300">
                Mark email as verified
              </Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateUser()} disabled={registerUserMutation.isPending}>
              {registerUserMutation.isPending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mockOpen} onOpenChange={setMockOpen}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle>Mock Sign-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Verify credentials against MongoDB without changing your session.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mock-email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="mock-email"
                value={mockEmail}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMockEmail(event.target.value)}
                className="bg-gray-900 border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mock-password" className="text-xs text-gray-300">
                Password
              </Label>
              <Input
                id="mock-password"
                type="password"
                value={mockPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMockPassword(event.target.value)}
                className="bg-gray-900 border text-white"
              />
            </div>
            {mockStatus !== "idle" ? (
              <div
                className={`rounded-md border px-3 py-2 text-xs ${
                  mockStatus === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {mockMessage}
              </div>
            ) : null}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setMockOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void handleMockSignIn()} disabled={mockSignInMutation.isPending}>
              {mockSignInMutation.isPending ? "Testing..." : "Test Sign-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
