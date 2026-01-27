"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { ListPanel } from "@/shared/ui/list-panel";
import { SectionHeader } from "@/shared/ui/section-header";
import { SectionPanel } from "@/shared/ui/section-panel";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { useToast } from "@/shared/ui/toast";
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
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  fetchAuthUserSecurity,
  fetchAuthUsers,
  mockSignIn,
  updateAuthUser,
  updateAuthUserSecurity,
} from "@/features/auth/api/users";
import { registerUser } from "@/features/auth/api/register";

const EMPTY_CREATE = { name: "", email: "", password: "", roleId: "none", verified: false };

export default function AuthUsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AuthUserSummary[]>([]);
  const [provider, setProvider] = useState<"prisma" | "mongodb">("prisma");
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);
  const [userRoles, setUserRoles] = useState<AuthUserRoleMap>({});
  const [search, setSearch] = useState("");
  const [savingRoles, setSavingRoles] = useState(false);
  const [dirtyRoles, setDirtyRoles] = useState(false);

  const [editingUser, setEditingUser] = useState<AuthUserSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editDisabled, setEditDisabled] = useState(false);
  const [editBanned, setEditBanned] = useState(false);
  const [editAllowedIps, setEditAllowedIps] = useState("");
  const [editMfaEnabled, setEditMfaEnabled] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creatingUser, setCreatingUser] = useState(false);

  const [mockEmail, setMockEmail] = useState("");
  const [mockPassword, setMockPassword] = useState("");
  const [mockStatus, setMockStatus] = useState<"idle" | "success" | "error">("idle");
  const [mockMessage, setMockMessage] = useState("");
  const [mockSigningIn, setMockSigningIn] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
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
      console.error("Failed to load users:", error);
      toast("Failed to load users", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      return (
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  const handleRoleChange = (userId: string, roleId: string) => {
    setUserRoles((prev) => {
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

  const handleSaveRoles = async () => {
    try {
      setSavingRoles(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AUTH_SETTINGS_KEYS.userRoles,
          value: serializeSetting(userRoles),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save roles");
      }
      setDirtyRoles(false);
      toast("User roles updated", { variant: "success" });
    } catch (error) {
      console.error("Failed to save user roles:", error);
      toast("Failed to save user roles", { variant: "error" });
    } finally {
      setSavingRoles(false);
    }
  };

  const handleOpenEdit = (user: AuthUserSummary) => {
    setEditingUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditVerified(Boolean(user.emailVerified));
    setEditDisabled(false);
    setEditBanned(false);
    setEditAllowedIps("");
    setEditMfaEnabled(false);
    setLoadingSecurity(true);
    void fetchAuthUserSecurity(user.id)
      .then((profile) => {
        setEditDisabled(Boolean(profile.disabledAt));
        setEditBanned(Boolean(profile.bannedAt));
        setEditAllowedIps((profile.allowedIps ?? []).join("\n"));
        setEditMfaEnabled(Boolean(profile.mfaEnabled));
      })
      .catch((error) => {
        console.error("Failed to load security profile:", error);
      })
      .finally(() => {
        setLoadingSecurity(false);
      });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      toast("Email is required", { variant: "error" });
      return;
    }
    try {
      setSavingUser(true);
      const payload: { name?: string; email: string; emailVerified?: boolean } = {
        email: editEmail.trim(),
      };
      if (editName.trim()) {
        payload.name = editName.trim();
      }
      if (editVerified !== Boolean(editingUser.emailVerified)) {
        payload.emailVerified = editVerified;
      }
      const result = await updateAuthUser(editingUser.id, payload);
      if (!result.ok) {
        throw new Error("Failed to update user");
      }
      const updated = result.payload as AuthUserSummary;
      const securityPayload = {
        disabled: editDisabled,
        banned: editBanned,
        allowedIps: editAllowedIps
          .split(/\r?\n|,/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      };
      const securityResult = await updateAuthUserSecurity(
        editingUser.id,
        securityPayload
      );
      if (!securityResult.ok) {
        throw new Error("Failed to update security settings");
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? updated : user))
      );
      toast("User updated", { variant: "success" });
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
      toast("Failed to update user", { variant: "error" });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!editingUser) return;
    try {
      const result = await updateAuthUserSecurity(editingUser.id, {
        disableMfa: true,
      });
      if (!result.ok) {
        throw new Error("Failed to disable MFA");
      }
      setEditMfaEnabled(false);
      toast("MFA disabled for user", { variant: "success" });
    } catch (error) {
      console.error("Failed to disable MFA:", error);
      toast("Failed to disable MFA", { variant: "error" });
    }
  };

  const handleCreateUser = async () => {
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
      setCreatingUser(true);
      const res = await registerUser({
        email: createForm.email.trim(),
        password: createForm.password.trim(),
        name: createForm.name.trim() || undefined,
      });
      if (!res.ok) {
        const errorPayload = res.payload as
          | { error?: string; details?: { issues?: string[] } }
          | null;
        const details = errorPayload?.details?.issues?.join(" ") ?? "";
        toast(
          errorPayload?.error
            ? `${errorPayload.error}${details ? ` ${details}` : ""}`
            : "Failed to create user",
          { variant: "error" }
        );
        return;
      }
      const created = res.payload as { id: string; email: string; name?: string | null };

      if (createForm.roleId && createForm.roleId !== "none") {
        const nextRoles = { ...userRoles, [created.id]: createForm.roleId };
        const rolesRes = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: AUTH_SETTINGS_KEYS.userRoles,
            value: serializeSetting(nextRoles),
          }),
        });
        if (rolesRes.ok) {
          setUserRoles(nextRoles);
          setDirtyRoles(false);
        }
      }

      if (createForm.verified) {
        await updateAuthUser(created.id, { emailVerified: true });
      }

      toast("User created", { variant: "success" });
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      void loadUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      toast("Failed to create user", { variant: "error" });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleMockSignIn = async () => {
    if (!mockEmail.trim() || !mockPassword.trim()) {
      setMockStatus("error");
      setMockMessage("Email and password are required.");
      return;
    }
    try {
      setMockSigningIn(true);
      setMockStatus("idle");
      setMockMessage("");
      const res = await mockSignIn({
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
      console.error("Mock sign-in failed:", error);
      setMockStatus("error");
      setMockMessage("Sign-in failed. Check server logs.");
    } finally {
      setMockSigningIn(false);
    }
  };

  return (
    <>
      <ListPanel
        header={
          <SectionHeader
            title="Users"
            description={`Manage user accounts and assign roles (provider: ${provider}).`}
            actions={
              <>
                <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => setMockOpen(true)}>
                  Mock Sign-in
                </Button>
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Create User
                </Button>
                <Button onClick={() => void handleSaveRoles()} disabled={!dirtyRoles || savingRoles}>
                  {savingRoles ? "Saving..." : "Save Roles"}
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
                onChange={(event) => setSearch(event.target.value)}
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
          <div className="rounded-md border border-dashed border-gray-800 p-6 text-center text-gray-400">
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
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name ?? "Unnamed"}</TableCell>
                    <TableCell className="text-gray-300">{user.email ?? "No email"}</TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-200">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Select
                        value={
                          roles.some((role) => role.id === userRoles[user.id])
                            ? (userRoles[user.id] as string)
                            : "none"
                        }
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="h-8 bg-gray-900 border-gray-700 text-white">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white">
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
                onChange={(event) => setEditName(event.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="edit-email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-verified"
                checked={editVerified} onCheckedChange={(checked) => setEditVerified(Boolean(checked))}
                className="h-4 w-4 rounded border-gray-700 bg-gray-900"
              />
              <Label htmlFor="edit-verified" className="text-xs text-gray-300">
                Email verified
              </Label>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-900/40 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-300">
                Security controls
              </div>
              {loadingSecurity ? (
                <div className="text-xs text-gray-500">Loading security profile...</div>
              ) : null}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-disabled"
                  checked={editDisabled} onCheckedChange={(checked) => setEditDisabled(Boolean(checked))}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900"
                />
                <Label htmlFor="edit-disabled" className="text-xs text-gray-300">
                  Disable account
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-banned"
                  checked={editBanned} onCheckedChange={(checked) => setEditBanned(Boolean(checked))}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900"
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
                  onChange={(event) => setEditAllowedIps(event.target.value)}
                  className="min-h-[80px] w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white"
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
            <Button onClick={() => void handleSaveUser()} disabled={savingUser}>
              {savingUser ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white">
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
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="create-email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="bg-gray-900 border-gray-700 text-white"
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
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role" className="text-xs text-gray-300">
                Role
              </Label>
              <Select
                value={createForm.roleId}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, roleId: value }))
                }
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {roles.map((role) => (
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
                checked={createForm.verified} onCheckedChange={(checked) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    verified: Boolean(checked),
                  }))
                }
                className="h-4 w-4 rounded border-gray-700 bg-gray-900"
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
            <Button onClick={() => void handleCreateUser()} disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mockOpen} onOpenChange={setMockOpen}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white">
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
                onChange={(event) => setMockEmail(event.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
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
                onChange={(event) => setMockPassword(event.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
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
            <Button onClick={() => void handleMockSignIn()} disabled={mockSigningIn}>
              {mockSigningIn ? "Testing..." : "Test Sign-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
