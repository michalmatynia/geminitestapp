"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/admin",
    });
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-gray-400">
            Use your credentials or a provider.
          </p>
        </div>
        {error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            Sign-in failed. Please check your credentials and try again.
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
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
          <button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="h-px flex-1 bg-gray-800" />
            or
            <span className="h-px flex-1 bg-gray-800" />
          </div>
          <button
            className="w-full rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/admin" })}
          >
            Continue with Google
          </button>
          <button
            className="w-full rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
            type="button"
            onClick={() => signIn("facebook", { callbackUrl: "/admin" })}
          >
            Continue with Facebook
          </button>
        </div>
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
