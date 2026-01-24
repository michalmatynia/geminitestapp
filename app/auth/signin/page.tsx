"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AUTH_SETTINGS_KEYS, parseJsonSetting } from "@/lib/constants/auth-management";
import { DEFAULT_AUTH_USER_PAGE_SETTINGS } from "@/lib/constants/auth-user-pages";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage =
    error === "AccountDisabled"
      ? "Account is disabled or banned."
      : error
      ? "Sign-in failed. Please check your credentials and try again."
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allowSocialLogin, setAllowSocialLogin] = useState(
    DEFAULT_AUTH_USER_PAGE_SETTINGS.allowSocialLogin
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!mfaRequired) {
      const verifyRes = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await verifyRes.json().catch(() => null)) as
        | { ok?: boolean; mfaRequired?: boolean; challengeId?: string; message?: string }
        | null;

      if (!verifyRes.ok || !payload?.ok) {
        setMessage(payload?.message ?? "Sign-in failed. Check your credentials.");
        setIsSubmitting(false);
        return;
      }

      if (payload.mfaRequired) {
        setChallengeId(payload.challengeId ?? null);
        setMfaRequired(true);
        setIsSubmitting(false);
        return;
      }

      await signIn("credentials", {
        email,
        password,
        challengeId: payload.challengeId ?? undefined,
        callbackUrl: "/admin",
      });
      setIsSubmitting(false);
      return;
    }

    await signIn("credentials", {
      email,
      password,
      otp,
      recoveryCode,
      challengeId: challengeId ?? undefined,
      callbackUrl: "/admin",
    });
    setIsSubmitting(false);
  };

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
        setAllowSocialLogin(Boolean(userPages.allowSocialLogin));
      } catch {
        // ignore
      }
    };
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-gray-400">
            Use your credentials or a provider.
          </p>
        </div>
        {message ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {message}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {errorMessage}
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
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
            />
          </div>
          {mfaRequired ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-300" htmlFor="otp">
                  One-time code
                </label>
                <input
                  id="otp"
                  type="text"
                  className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300" htmlFor="recovery">
                  Recovery code (optional)
                </label>
                <input
                  id="recovery"
                  type="text"
                  className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  placeholder="ABCD-1234-EFGH"
                />
              </div>
            </>
          ) : null}
          <button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : mfaRequired ? "Verify & sign in" : "Sign in"}
          </button>
        </form>
        {allowSocialLogin ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-800" />
              or
              <span className="h-px flex-1 bg-gray-800" />
            </div>
            <button
              className="w-full rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
              type="button"
              onClick={() => void signIn("google", { callbackUrl: "/admin" })}
            >
              Continue with Google
            </button>
            <button
              className="w-full rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
              type="button"
              onClick={() => void signIn("facebook", { callbackUrl: "/admin" })}
            >
              Continue with Facebook
            </button>
          </div>
        ) : null}
        <p className="text-xs text-gray-400">
          No account?{" "}
          <Link href="/auth/register" className="text-white hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
