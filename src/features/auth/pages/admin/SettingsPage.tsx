"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useToast } from "@/shared/ui/toast";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/shared/ui/section-header";
import { SectionPanel } from "@/shared/ui/section-panel";
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  type AuthRole,
} from "@/features/auth/utils/auth-management";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  DEFAULT_AUTH_SECURITY_POLICY,
  normalizeAuthSecurityPolicy,
  type AuthSecurityPolicy,
} from "@/features/auth/utils/auth-security";
import { fetchAuthUserSecurity } from "@/features/auth/api/users";
import { disableMfa, setupMfa, verifyMfa } from "@/features/auth/api/mfa";

export default function AuthSettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);
  const [defaultRole, setDefaultRole] = useState<string>("viewer");
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(
    DEFAULT_AUTH_SECURITY_POLICY
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpAuth, setMfaOtpAuth] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaDisabling, setMfaDisabling] = useState(false);

  const roleOptions = useMemo(
    () =>
      mergeDefaultRoles(roles).map((role) => ({
        id: role.id,
        name: role.name,
      })),
    [roles]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load auth settings.");
        const settings = (await res.json()) as Array<{ key: string; value: string }>;
        if (!mounted) return;
        const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
        const storedRoles = mergeDefaultRoles(
          parseJsonSetting<AuthRole[]>(
            settingsMap.get(AUTH_SETTINGS_KEYS.roles),
            DEFAULT_AUTH_ROLES
          )
        );
        setRoles(storedRoles);
        const storedDefault = settingsMap.get(AUTH_SETTINGS_KEYS.defaultRole);
        const nextDefault =
          storedDefault && storedRoles.some((role) => role.id === storedDefault)
            ? storedDefault
            : storedRoles.find((role) => role.id === "viewer")?.id ??
              storedRoles[0]?.id ??
              "viewer";
        setDefaultRole(nextDefault);
        setDefaultDirty(false);

        const storedPolicyRaw = settingsMap.get(AUTH_SETTINGS_KEYS.securityPolicy);
        const parsedPolicy = storedPolicyRaw
          ? normalizeAuthSecurityPolicy(parseJsonSetting(storedPolicyRaw, DEFAULT_AUTH_SECURITY_POLICY))
          : DEFAULT_AUTH_SECURITY_POLICY;
        setSecurityPolicy(parsedPolicy);
        setSecurityDirty(false);
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Failed to load auth settings.",
          { variant: "error" }
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const loadSecurity = async () => {
      try {
        const data = await fetchAuthUserSecurity(session.user.id);
        if (!active) return;
        setMfaEnabled(Boolean(data.mfaEnabled));
      } catch {
        // ignore
      }
    };
    void loadSecurity();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const saveDefaultRole = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AUTH_SETTINGS_KEYS.defaultRole,
          value: defaultRole,
        }),
      });
      if (!res.ok) throw new Error("Failed to save default role.");
      setDefaultDirty(false);
      toast("Default role saved.", { variant: "success" });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save settings.",
        { variant: "error" }
      );
    } finally {
      setSaving(false);
    }
  };

  const saveSecurityPolicy = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AUTH_SETTINGS_KEYS.securityPolicy,
          value: JSON.stringify(securityPolicy),
        }),
      });
      if (!res.ok) throw new Error("Failed to save security policy.");
      setSecurityDirty(false);
      toast("Security policy saved.", { variant: "success" });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save security policy.",
        { variant: "error" }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMfaSetup = async () => {
    try {
      setMfaLoading(true);
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      const res = await setupMfa();
      if (!res.ok) {
        throw new Error("Failed to start MFA setup.");
      }
      const payload = res.payload as { secret?: string; otpauthUrl?: string };
      setMfaSecret(payload.secret ?? null);
      setMfaOtpAuth(payload.otpauthUrl ?? null);
      toast("MFA setup started. Enter the code from your authenticator app.", {
        variant: "success",
      });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to start MFA setup.",
        { variant: "error" }
      );
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaToken.trim()) {
      toast("Enter the MFA code from your authenticator app.", { variant: "error" });
      return;
    }
    try {
      setMfaVerifying(true);
      const res = await verifyMfa(mfaToken.trim());
      const payload = res.payload as {
        recoveryCodes?: string[];
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to verify MFA.");
      }
      setRecoveryCodes(payload?.recoveryCodes ?? []);
      setMfaEnabled(true);
      setMfaToken("");
      toast("MFA enabled. Save your recovery codes.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to verify MFA.", {
        variant: "error",
      });
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!mfaDisableCode.trim()) {
      toast("Enter a code to disable MFA.", { variant: "error" });
      return;
    }
    try {
      setMfaDisabling(true);
      const res = await disableMfa({
        token: mfaDisableCode.trim(),
        recoveryCode: mfaDisableCode.trim(),
      });
      const payload = res.payload as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to disable MFA.");
      }
      setMfaEnabled(false);
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      setMfaDisableCode("");
      toast("MFA disabled.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to disable MFA.", {
        variant: "error",
      });
    } finally {
      setMfaDisabling(false);
    }
  };

  return (
    <SectionPanel className="p-6 space-y-6">
      <SectionHeader
        title="Auth Settings"
        description="Authentication data source is managed globally."
      />

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4">
        <h2 className="text-lg font-semibold text-white">Default role</h2>
        <p className="mt-1 text-xs text-gray-400">
          Users without an explicit role will receive this role. To avoid
          unintended access, set this to a low-privilege role.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select
            value={defaultRole}
            onValueChange={(value) => {
              setDefaultRole(value);
              setDefaultDirty(true);
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-64 bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select default role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void saveDefaultRole()} disabled={!defaultDirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Security policy</h2>
          <p className="mt-1 text-xs text-gray-400">
            Control password strength and login protection rules.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Minimum password length</Label>
            <Input
              type="number"
              min={6}
              max={64}
              value={securityPolicy.minPasswordLength}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  minPasswordLength: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Require strong password</Label>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={securityPolicy.requireStrongPassword} onCheckedChange={(checked) => {
                  setSecurityPolicy((prev) => ({
                    ...prev,
                    requireStrongPassword: Boolean(checked),
                  }));
                  setSecurityDirty(true);
                }}
                className="h-4 w-4 rounded border-gray-700 bg-gray-900"
              />
              <span className="text-xs text-gray-400">
                Enforce uppercase, lowercase, number, and symbol.
              </span>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-gray-300">Password rules</Label>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {(
                [
                  ["requireUppercase", "Uppercase"],
                  ["requireLowercase", "Lowercase"],
                  ["requireNumber", "Number"],
                  ["requireSymbol", "Symbol"],
                ] as const
              ).map(([key, label]) => (
                <Label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={securityPolicy[key]} onCheckedChange={(checked) => {
                      setSecurityPolicy((prev) => ({
                        ...prev,
                        [key]: Boolean(checked),
                      }));
                      setSecurityDirty(true);
                    }}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900"
                  />
                  {label}
                </Label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout attempts</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={securityPolicy.lockoutMaxAttempts}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  lockoutMaxAttempts: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout window (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.lockoutWindowMinutes}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  lockoutWindowMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.lockoutDurationMinutes}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  lockoutDurationMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit attempts</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={securityPolicy.ipRateLimitMaxAttempts}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  ipRateLimitMaxAttempts: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit window (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.ipRateLimitWindowMinutes}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  ipRateLimitWindowMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.ipRateLimitDurationMinutes}
              onChange={(event) => {
                setSecurityPolicy((prev) => ({
                  ...prev,
                  ipRateLimitDurationMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void saveSecurityPolicy()} disabled={!securityDirty || saving}>
            {saving ? "Saving..." : "Save security policy"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Multi-factor authentication</h2>
          <p className="mt-1 text-xs text-gray-400">
            Enable MFA for your account and store recovery codes securely.
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Status: {mfaEnabled ? "Enabled" : "Disabled"}
        </div>
        {!mfaEnabled ? (
          <div className="space-y-3">
            <Button onClick={() => void handleMfaSetup()} disabled={mfaLoading}>
              {mfaLoading ? "Starting..." : "Start MFA setup"}
            </Button>
            {mfaSecret ? (
              <div className="rounded-md border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-300 space-y-2">
                <div>Secret: {mfaSecret}</div>
                {mfaOtpAuth ? <div>OTP URL: {mfaOtpAuth}</div> : null}
              </div>
            ) : null}
            {mfaSecret ? (
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Enter MFA code</Label>
                <Input
                  value={mfaToken}
                  onChange={(event) => setMfaToken(event.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="123456"
                />
                <Button onClick={() => void handleMfaVerify()} disabled={mfaVerifying}>
                  {mfaVerifying ? "Verifying..." : "Verify & enable"}
                </Button>
              </div>
            ) : null}
            {recoveryCodes.length > 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                <div className="font-semibold">Recovery codes (save these now)</div>
                <div className="mt-2 grid gap-1">
                  {recoveryCodes.map((code) => (
                    <div key={code}>{code}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Disable MFA (enter code)</Label>
            <Input
              value={mfaDisableCode}
              onChange={(event) => setMfaDisableCode(event.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="MFA code or recovery code"
            />
            <Button variant="outline" onClick={() => void handleMfaDisable()} disabled={mfaDisabling}>
              {mfaDisabling ? "Disabling..." : "Disable MFA"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Go to Settings → Database to choose the global provider for the entire app.
      </div>
      <div>
        <Link
          href="/admin/settings/database"
          className="text-sm font-semibold text-blue-400 underline"
        >
          Open Database Settings
        </Link>
      </div>
    </SectionPanel>
  );
}
