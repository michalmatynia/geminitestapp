"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const payload = await response.json();
        setError(payload?.error ?? "Failed to create account.");
        setIsSubmitting(false);
        return;
      }

      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin",
      });
    } catch (err) {
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
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              minLength={8}
            />
            <p className="text-xs text-gray-500">Minimum 8 characters.</p>
          </div>
          <button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            type="submit"
            disabled={isSubmitting}
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
