"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { AUTH_SETTINGS_KEYS, parseJsonSetting } from "@/lib/constants/auth-management";
import { DEFAULT_AUTH_USER_PAGE_SETTINGS } from "@/lib/constants/auth-user-pages";
import { DEFAULT_AUTH_SECURITY_POLICY } from "@/lib/constants/auth-security";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowSignup, setAllowSignup] = useState(
    DEFAULT_AUTH_USER_PAGE_SETTINGS.allowSignup
  );

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const settings = (await res.json()) as Array<{ key: string; value: string }>;
        const map = new Map(settings.map((item) => [item.key, item.value]));
        const userPages = parseJsonSetting(
          map.get(AUTH_SETTINGS_KEYS.userPages),
          DEFAULT_AUTH_USER_PAGE_SETTINGS
        );
        if (!active) return;
        setAllowSignup(Boolean(userPages.allowSignup));
      } catch {
        // ignore
      }
    };
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; details?: { issues?: string[] } }
          | null;
        const details = payload?.details?.issues?.join(" ") ?? "";
        setError(
          payload?.error
            ? `${payload.error}${details ? ` ${details}` : ""}`
            : "Failed to create account."
        );
        setIsSubmitting(false);
        return;
      }

      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin",
      });
    } catch (_err) {
      setError("Failed to create account.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
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
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="name">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!allowSignup}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!allowSignup}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength}
              disabled={!allowSignup}
            />
            <p className="text-xs text-gray-500">
              Minimum {DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} characters.
            </p>
          </div>
          <button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting || !allowSignup}
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
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
