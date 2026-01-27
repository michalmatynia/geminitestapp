import type { NextAuthConfig } from "next-auth";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// Basic config that is edge-compatible
const adminOnlyPrefixes = ["/admin/auth", "/admin/products"];
const elevatedRoles = new Set(["admin", "super_admin", "superuser"]);

const permissionRules: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/admin/auth/permissions", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth/settings", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth/users", permissions: ["auth.users.write"] },
  { prefix: "/admin/auth", permissions: ["auth.users.read"] },
  { prefix: "/admin/products", permissions: ["products.manage"] },
  { prefix: "/admin/drafts", permissions: ["products.manage"] },
  { prefix: "/admin/notes", permissions: ["notes.manage"] },
  { prefix: "/admin/chatbot", permissions: ["chatbot.manage"] },
  { prefix: "/admin/agentcreator", permissions: ["chatbot.manage"] },
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
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      if (isOnAdmin) {
        if (!isLoggedIn) return false;
        const authUser = auth?.user as {
          role?: string;
          isElevated?: boolean;
          accountDisabled?: boolean;
          accountBanned?: boolean;
        };
        const role = authUser?.role ?? "unknown";
        const isElevated = authUser?.isElevated ?? elevatedRoles.has(role);
        if (authUser?.accountBanned || authUser?.accountDisabled) {
          const redirectUrl = new URL("/auth/signin", nextUrl);
          redirectUrl.searchParams.set("error", "AccountDisabled");
          return Response.redirect(redirectUrl);
        }
        if (adminOnlyPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix))) {
          if (!isElevated) {
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
          isElevated ||
          requiredPermissions.some((permission) => permissions.includes(permission));
        if (hasAccess) return true;
        const redirectUrl = new URL("/admin", nextUrl);
        redirectUrl.searchParams.set("denied", "1");
        return Response.redirect(redirectUrl);
      }
      return true;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role = (token as { role?: string }).role ?? null;
        session.user.permissions =
          (token as { permissions?: string[] }).permissions ?? [];
        session.user.roleLevel = (token as { roleLevel?: number }).roleLevel ?? null;
        session.user.isElevated = (token as { isElevated?: boolean }).isElevated ?? false;
        session.user.accountDisabled =
          (token as { accountDisabled?: boolean }).accountDisabled ?? false;
        session.user.accountBanned =
          (token as { accountBanned?: boolean }).accountBanned ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
