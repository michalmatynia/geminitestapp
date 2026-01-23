import type { NextAuthConfig } from "next-auth";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// Basic config that is edge-compatible
const adminOnlyPrefixes = ["/admin/auth", "/admin/products"];

const permissionRules: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/admin/auth/permissions", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth/settings", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth/users", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth", permissions: ["auth.users.read"] },
  { prefix: "/admin/products", permissions: ["products.manage"] },
  { prefix: "/admin/drafts", permissions: ["products.manage"] },
  { prefix: "/admin/notes", permissions: ["notes.manage"] },
  { prefix: "/admin/chatbot", permissions: ["chatbot.manage"] },
  { prefix: "/admin/integrations", permissions: ["settings.manage"] },
  { prefix: "/admin/system", permissions: ["settings.manage"] },
  { prefix: "/admin/settings", permissions: ["settings.manage"] },
  { prefix: "/admin/files", permissions: ["settings.manage"] },
  { prefix: "/admin/databases", permissions: ["settings.manage"] },
  { prefix: "/admin/front-manage", permissions: ["settings.manage"] },
  { prefix: "/admin/cms", permissions: ["settings.manage"] },
];

const resolveRequiredPermissions = (pathname: string) => {
  for (const rule of permissionRules) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.permissions;
    }
  }
  return [];
};

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
      // TEMP: Disable auth checks in development
      if (process.env.NODE_ENV === "development") {
        return true;
      }

      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      if (isOnAdmin) {
        if (!isLoggedIn) return false;
        const role = (auth?.user as { role?: string })?.role ?? "unknown";
        if (adminOnlyPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix))) {
          if (role !== "admin") {
            const redirectUrl = new URL("/admin", nextUrl);
            redirectUrl.searchParams.set("denied", "1");
            return Response.redirect(redirectUrl);
          }
          return true;
        }

        const requiredPermissions = resolveRequiredPermissions(nextUrl.pathname);
        if (requiredPermissions.length === 0) return true;
        const permissions = (auth?.user as { permissions?: string[] })?.permissions ?? [];
        const hasAccess =
          role === "admin" ||
          requiredPermissions.some((permission) => permissions.includes(permission));
        if (hasAccess) return true;
        const redirectUrl = new URL("/admin", nextUrl);
        redirectUrl.searchParams.set("denied", "1");
        return Response.redirect(redirectUrl);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
