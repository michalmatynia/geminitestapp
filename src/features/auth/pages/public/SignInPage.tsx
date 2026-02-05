"use client";

import { Button, Input, Label, Alert } from "@/shared/ui";
import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { DEFAULT_AUTH_USER_PAGE_SETTINGS } from "@/features/auth/utils/auth-user-pages";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { useVerifyCredentials } from "@/features/auth/hooks/useAuthQueries";
import { useSettingsMap } from "@/shared/hooks/use-settings";



function SignInPageLoader(): React.JSX.Element {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const settingsQuery = useSettingsMap({ enabled: isClient });

  if (!isClient || settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-lg animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-gray-800" />
            <div className="h-4 w-48 rounded bg-gray-800" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-gray-800" />
              <div className="h-10 w-full rounded bg-gray-800" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-800" />
              <div className="h-10 w-full rounded bg-gray-800" />
            </div>
            <div className="h-10 w-full rounded bg-gray-800" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-800" />
              <span className="h-3 w-10 rounded bg-gray-800" />
              <span className="h-px flex-1 bg-gray-800" />
            </div>
            <div className="h-9 w-full rounded bg-gray-800" />
            <div className="h-9 w-full rounded bg-gray-800" />
          </div>
          <div className="h-3 w-40 rounded bg-gray-800" />
        </div>
      </div>
    );
  }

  const userPages = parseJsonSetting(
    settingsQuery.data.get(AUTH_SETTINGS_KEYS.userPages),
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
  const allowSocialLogin = Boolean(userPages.allowSocialLogin);

  return <SignInForm allowSocialLogin={allowSocialLogin} />;
}

function SignInForm({ allowSocialLogin }: { allowSocialLogin: boolean }): React.JSX.Element {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyCredentialsMutation = useVerifyCredentials();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!mfaRequired) {
      try {
        const { ok, payload } = await verifyCredentialsMutation.mutateAsync({ email, password });
        if (!ok || !payload.ok) {
          setMessage(payload.message ?? "Sign-in failed. Check your credentials.");
          setIsSubmitting(false);
          return;
        }

        if (payload.mfaRequired) {
          setChallengeId(payload.challengeId ?? null);
          setMfaRequired(true);
          setIsSubmitting(false);
          return;
        }

        try {
          await signIn("credentials", {
            email,
            password,
            challengeId: payload.challengeId ?? undefined,
            callbackUrl: "/admin",
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Sign-in failed. Please try again.";
          setMessage(message);
        } finally {
          setIsSubmitting(false);
        }
        return;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to verify credentials. Check your connection.";
        setMessage(message);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await signIn("credentials", {
        email,
        password,
        otp,
        recoveryCode,
        challengeId: challengeId ?? undefined,
        callbackUrl: "/admin",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.";
      setMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-gray-400">
            Use your credentials or a provider.
          </p>
        </div>
        {message ? (
          <Alert variant="error" className="p-3 text-xs">
            {message}
          </Alert>
        ) : null}
        {errorMessage ? (
          <Alert variant="error" className="p-3 text-xs">
            {errorMessage}
          </Alert>
        ) : null}
        <form className="space-y-4" onSubmit={(e: React.FormEvent<HTMLFormElement>) => void handleSubmit(e)}>
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
            />
          </div>
          {mfaRequired ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-gray-300" htmlFor="otp">
                  One-time code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
                  value={otp}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOtp(event.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-300" htmlFor="recovery">
                  Recovery code (optional)
                </Label>
                <Input
                  id="recovery"
                  type="text"
                  className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
                  value={recoveryCode}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRecoveryCode(event.target.value)}
                  placeholder="ABCD-1234-EFGH"
                />
              </div>
            </>
          ) : null}
          <Button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : mfaRequired ? "Verify & sign in" : "Sign in"}
          </Button>
        </form>
        {allowSocialLogin ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-800" />
              or
              <span className="h-px flex-1 bg-gray-800" />
            </div>
            <Button
              className="w-full rounded-md border px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
              type="button"
              onClick={() => void signIn("google", { callbackUrl: "/admin" })}
            >
              Continue with Google
            </Button>
            <Button
              className="w-full rounded-md border px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
              type="button"
              onClick={() => void signIn("facebook", { callbackUrl: "/admin" })}
            >
              Continue with Facebook
            </Button>
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

export default function SignInPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInPageLoader />
    </Suspense>
  );
}
