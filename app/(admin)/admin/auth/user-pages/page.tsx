"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { AUTH_SETTINGS_KEYS, parseJsonSetting, serializeSetting } from "@/lib/constants/auth-management";

type UserPageSettings = {
  allowSignup: boolean;
  allowPasswordReset: boolean;
  allowSocialLogin: boolean;
  requireEmailVerification: boolean;
  requireStrongPassword: boolean;
};

const DEFAULT_USER_PAGE_SETTINGS: UserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
  requireStrongPassword: true,
};

export default function AuthUserPagesPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserPageSettings>(DEFAULT_USER_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const map = new Map(data.map((item) => [item.key, item.value]));
        const stored = parseJsonSetting<UserPageSettings>(
          map.get(AUTH_SETTINGS_KEYS.userPages),
          DEFAULT_USER_PAGE_SETTINGS
        );
        setSettings(stored);
      } catch (error) {
        console.error("Failed to load user page settings:", error);
        toast("Failed to load user page settings", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  const handleToggle = (key: keyof UserPageSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AUTH_SETTINGS_KEYS.userPages,
          value: serializeSetting(settings),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
      setDirty(false);
      toast("User page settings saved", { variant: "success" });
    } catch (error) {
      console.error("Failed to save user page settings:", error);
      toast("Failed to save user page settings", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg text-sm text-gray-400">
        Loading user page settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white">User Pages</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configure which authentication flows are available in the public UI.
        </p>
      </div>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Authentication Flows</CardTitle>
          <CardDescription className="text-gray-500">
            Toggle each flow on/off. These settings can be wired into your public auth pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["allowSignup", "Allow sign-up", "Enable self-service user registration."],
              ["allowPasswordReset", "Allow password reset", "Enable forgot-password flow."],
              ["allowSocialLogin", "Allow social login", "Show OAuth providers on login."],
              ["requireEmailVerification", "Require email verification", "Block access until email is verified."],
              ["requireStrongPassword", "Require strong passwords", "Enforce stricter password rules."],
            ] as const
          ).map(([key, title, description]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/40 px-4 py-3"
            >
              <div>
                <Label className="text-sm text-gray-200">{title}</Label>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
