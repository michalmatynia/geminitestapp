import type { NextAuthConfig } from "next-auth";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// Basic config that is edge-compatible
export const authConfig = {
  providers: [], // Providers will be added in the main auth.ts or passed here
  pages: {
    signIn: "/auth/signin",
  },
  trustHost: true,
  ...(secret ? { secret } : {}),
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      if (isOnAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
