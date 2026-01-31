"use client";

import { Button, Input, Label } from "@/shared/ui";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { DEFAULT_AUTH_USER_PAGE_SETTINGS } from "@/features/auth/utils/auth-user-pages";
import { DEFAULT_AUTH_SECURITY_POLICY } from "@/features/auth/utils/auth-security";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { useRegisterUser } from "@/features/auth/hooks/useAuthQueries";
import { useSettingsMap } from "@/shared/hooks/useSettings";



export default function RegisterPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const userPages = parseJsonSetting(
    settingsQuery.data.get(AUTH_SETTINGS_KEYS.userPages),
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
  const allowSignup = Boolean(userPages.allowSignup);

  return <RegisterForm allowSignup={allowSignup} />;
}

function RegisterForm({ allowSignup }: { allowSignup: boolean }): React.JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const registerUserMutation = useRegisterUser();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await registerUserMutation.mutateAsync({
        name: name.trim() || undefined,
        email,
        password,
      });

      if (!response.ok) {
        const payload = response.payload as
          | { error?: string; details?: { issues?: string[] } }
          | null;
        const details = payload?.details?.issues?.join(" ") ?? "";
        setError(
          payload?.error
            ? `${payload.error}${details ? ` ${details}` : ""}`
            : "Failed to create account."
        );
        return;
      }

      try {
        await signIn("credentials", {
          email,
          password,
          callbackUrl: "/admin",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sign-in failed. Please try again.";
        setError(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-white">Create account</h1>
          <p className="mt-1 text-sm text-gray-400">
            Create a new account with email and password.
          </p>
        </div>
        {error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {error}
          </div>
        ) : null}
        {!allowSignup ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Self-service registration is disabled. Please contact an administrator.
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={(e: React.FormEvent<HTMLFormElement>) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label className="text-sm text-gray-300" htmlFor="name">
              Name (optional)
            </Label>
            <Input
              id="name"
              type="text"
              className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
              value={name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              disabled={!allowSignup}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-300" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              required
              disabled={!allowSignup}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-300" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              required
              minLength={DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength}
              disabled={!allowSignup}
            />
            <p className="text-xs text-gray-500">
              Minimum {DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} characters.
            </p>
          </div>
          <Button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting || !allowSignup}
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
