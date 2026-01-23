"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  parseJsonSetting,
  serializeSetting,
  type AuthPermission,
  type AuthRole,
} from "@/lib/constants/auth-management";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function AuthPermissionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [permissions, setPermissions] = useState<AuthPermission[]>(DEFAULT_AUTH_PERMISSIONS);
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);

  const [newPermissionId, setNewPermissionId] = useState("");
  const [newPermissionName, setNewPermissionName] = useState("");
  const [newPermissionDescription, setNewPermissionDescription] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const settings = (await res.json()) as Array<{ key: string; value: string }>;
        const map = new Map(settings.map((item) => [item.key, item.value]));
        const storedPermissions = parseJsonSetting<AuthPermission[]>(
          map.get(AUTH_SETTINGS_KEYS.permissions),
          DEFAULT_AUTH_PERMISSIONS
        );
        const storedRoles = mergeDefaultRoles(
          parseJsonSetting<AuthRole[]>(
            map.get(AUTH_SETTINGS_KEYS.roles),
            DEFAULT_AUTH_ROLES
          )
        );
        setPermissions(storedPermissions);
        setRoles(storedRoles);
      } catch (error) {
        console.error("Failed to load permissions settings:", error);
        toast("Failed to load permission settings", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  const permissionIds = useMemo(
    () => new Set(permissions.map((permission) => permission.id)),
    [permissions]
  );

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        const hasPermission = role.permissions.includes(permissionId);
        const nextPermissions = hasPermission
          ? role.permissions.filter((id) => id !== permissionId)
          : [...role.permissions, permissionId];
        return { ...role, permissions: nextPermissions };
      })
    );
    setDirty(true);
  };

  const handleAddPermission = () => {
    const id = newPermissionId.trim() || slugify(newPermissionName);
    if (!id || !newPermissionName.trim()) {
      toast("Provide a permission name", { variant: "error" });
      return;
    }
    if (permissionIds.has(id)) {
      toast("Permission ID already exists", { variant: "error" });
      return;
    }
    setPermissions((prev) => [
      ...prev,
      {
        id,
        name: newPermissionName.trim(),
        description: newPermissionDescription.trim() || undefined,
      },
    ]);
    setNewPermissionId("");
    setNewPermissionName("");
    setNewPermissionDescription("");
    setDirty(true);
  };

  const handleRemovePermission = (permissionId: string) => {
    setPermissions((prev) => prev.filter((permission) => permission.id !== permissionId));
    setRoles((prev) =>
      prev.map((role) => ({
        ...role,
        permissions: role.permissions.filter((id) => id !== permissionId),
      }))
    );
    setDirty(true);
  };

  const handleAddRole = () => {
    const id = slugify(newRoleName);
    if (!id || !newRoleName.trim()) {
      toast("Provide a role name", { variant: "error" });
      return;
    }
    if (roles.some((role) => role.id === id)) {
      toast("Role ID already exists", { variant: "error" });
      return;
    }
    setRoles((prev) => [
      ...prev,
      {
        id,
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        permissions: [],
      },
    ]);
    setNewRoleName("");
    setNewRoleDescription("");
    setDirty(true);
  };

  const handleRemoveRole = (roleId: string) => {
    if (roleId === "admin") {
      toast("Admin role cannot be removed", { variant: "error" });
      return;
    }
    setRoles((prev) => prev.filter((role) => role.id !== roleId));
    setDirty(true);
  };

  const handleRoleFieldChange = (roleId: string, field: "name" | "description", value: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId ? { ...role, [field]: value } : role
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payloads = [
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: AUTH_SETTINGS_KEYS.permissions,
            value: serializeSetting(permissions),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: AUTH_SETTINGS_KEYS.roles,
            value: serializeSetting(roles),
          }),
        }),
      ];
      const responses = await Promise.all(payloads);
      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to save permission settings");
      }
      setDirty(false);
      toast("Permission settings saved", { variant: "success" });
    } catch (error) {
      console.error("Failed to save permission settings:", error);
      toast("Failed to save permission settings", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions(DEFAULT_AUTH_PERMISSIONS);
    setRoles(DEFAULT_AUTH_ROLES);
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg text-sm text-gray-400">
        Loading permission settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white">Permissions</h1>
        <p className="mt-2 text-sm text-gray-400">
          Define roles and the permissions they include. Enforcement is handled by the
          application logic you wire up later.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Permissions Library</CardTitle>
            <CardDescription className="text-gray-500">
              Create permission keys that can be assigned to roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="rounded-md border border-gray-800 bg-gray-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{permission.name}</div>
                      <div className="text-xs text-gray-400">{permission.id}</div>
                      {permission.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {permission.description}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePermission(permission.id)}
                      className="text-xs text-red-200 hover:bg-red-500/10"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-gray-800 bg-gray-900/40 p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Add Permission</div>
              <div className="space-y-2">
                <Label htmlFor="permission-name" className="text-xs text-gray-300">
                  Name
                </Label>
                <Input
                  id="permission-name"
                  value={newPermissionName}
                  onChange={(event) => setNewPermissionName(event.target.value)}
                  placeholder="Manage products"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission-id" className="text-xs text-gray-300">
                  Permission ID
                </Label>
                <Input
                  id="permission-id"
                  value={newPermissionId}
                  onChange={(event) => setNewPermissionId(event.target.value)}
                  placeholder="products.manage"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission-description" className="text-xs text-gray-300">
                  Description
                </Label>
                <Input
                  id="permission-description"
                  value={newPermissionDescription}
                  onChange={(event) => setNewPermissionDescription(event.target.value)}
                  placeholder="Create and edit product listings"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <Button onClick={handleAddPermission} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Permission
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Roles</CardTitle>
            <CardDescription className="text-gray-500">
              Assign permission bundles to each role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-md border border-gray-800 bg-gray-900/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs text-gray-400">Role name</Label>
                    <Input
                      value={role.name}
                      onChange={(event) => handleRoleFieldChange(role.id, "name", event.target.value)}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <Label className="text-xs text-gray-400">Description</Label>
                    <Input
                      value={role.description ?? ""}
                      onChange={(event) =>
                        handleRoleFieldChange(role.id, "description", event.target.value)
                      }
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <div className="text-xs text-gray-500">ID: {role.id}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(role.id)}
                    className="text-xs text-red-200 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start gap-2 text-xs text-gray-300"
                    >
                      <Checkbox
                        checked={role.permissions.includes(permission.id)}
                        onCheckedChange={() => handleTogglePermission(role.id, permission.id)}
                      />
                      <span>
                        <span className="font-semibold text-gray-200">{permission.name}</span>
                        <span className="block text-gray-500">{permission.id}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-md border border-gray-800 bg-gray-900/40 p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Add Role</div>
              <div className="space-y-2">
                <Label htmlFor="role-name" className="text-xs text-gray-300">
                  Role name
                </Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="Editor"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description" className="text-xs text-gray-300">
                  Description
                </Label>
                <Input
                  id="role-description"
                  value={newRoleDescription}
                  onChange={(event) => setNewRoleDescription(event.target.value)}
                  placeholder="Manage content and products"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <Button onClick={handleAddRole} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Role
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          Reset defaults
        </Button>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save permissions"}
        </Button>
      </div>
    </div>
  );
}
