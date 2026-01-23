"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_ROLES,
  parseJsonSetting,
  serializeSetting,
  type AuthRole,
  type AuthUserRoleMap,
} from "@/lib/constants/auth-management";
import type { AuthUserSummary } from "@/types/auth";

type AuthUsersResponse = {
  provider: "prisma" | "mongodb";
  users: AuthUserSummary[];
};

const EMPTY_CREATE = { name: "", email: "", password: "" };

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
  const [savingUser, setSavingUser] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creatingUser, setCreatingUser] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, settingsRes] = await Promise.all([
        fetch("/api/auth/users"),
        fetch("/api/settings"),
      ]);
      if (!usersRes.ok) {
        throw new Error("Failed to load users");
      }
      const usersPayload = (await usersRes.json()) as AuthUsersResponse;
      setUsers(usersPayload.users ?? []);
      setProvider(usersPayload.provider ?? "prisma");

      if (settingsRes.ok) {
        const settings = (await settingsRes.json()) as Array<{ key: string; value: string }>;
        const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
        const storedRoles = parseJsonSetting<AuthRole[]>(
          settingsMap.get(AUTH_SETTINGS_KEYS.roles),
          DEFAULT_AUTH_ROLES
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
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      toast("Email is required", { variant: "error" });
      return;
    }
    try {
      setSavingUser(true);
      const payload: { name?: string; email: string } = {
        email: editEmail.trim(),
      };
      if (editName.trim()) {
        payload.name = editName.trim();
      }
      const res = await fetch(`/api/auth/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update user");
      }
      const updated = (await res.json()) as AuthUserSummary;
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

  const handleCreateUser = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      toast("Email and password are required", { variant: "error" });
      return;
    }
    if (createForm.password.trim().length < 8) {
      toast("Password must be at least 8 characters", { variant: "error" });
      return;
    }
    try {
      setCreatingUser(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password.trim(),
          name: createForm.name.trim() || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create user");
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

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage user accounts and assign roles (provider: {provider}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            Create User
          </Button>
          <Button onClick={() => void handleSaveRoles()} disabled={!dirtyRoles || savingRoles}>
            {savingRoles ? "Saving..." : "Save Roles"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or ID"
          className="bg-gray-900 border-gray-700 text-white sm:max-w-xs"
        />
        <div className="text-xs text-gray-500">
          {dirtyRoles ? "Unsaved role changes" : "Roles are up to date"}
        </div>
      </div>

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
    </div>
  );
}
