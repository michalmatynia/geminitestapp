"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Switch, useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import { useEffect, useState } from "react";







import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import {
  DEFAULT_AUTH_USER_PAGE_SETTINGS,
  type AuthUserPageSettings,
} from "@/features/auth/utils/auth-user-pages";

export default function AuthUserPagesPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AuthUserPageSettings>(
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
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
        const stored = parseJsonSetting<AuthUserPageSettings>(
          map.get(AUTH_SETTINGS_KEYS.userPages),
          DEFAULT_AUTH_USER_PAGE_SETTINGS
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

  const handleToggle = (key: keyof AuthUserPageSettings) => {
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
      <SectionPanel className="p-6 text-sm text-gray-400">
        Loading user page settings...
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-6">
      <SectionPanel className="p-6">
        <SectionHeader
          title="User Pages"
          description="Configure which authentication flows are available in the public UI."
        />
      </SectionPanel>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg">Authentication Flows</CardTitle>
          <CardDescription className="text-gray-500">
            Toggle each flow on/off. Password strength rules live in Auth Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["allowSignup", "Allow sign-up", "Enable self-service user registration."],
              ["allowPasswordReset", "Allow password reset", "Enable forgot-password flow."],
              ["allowSocialLogin", "Allow social login", "Show OAuth providers on login."],
              ["requireEmailVerification", "Require email verification", "Block access until email is verified."],
            ] as const
          ).map(([key, title, description]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3"
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
