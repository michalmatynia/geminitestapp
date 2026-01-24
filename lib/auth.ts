import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getMongoClient } from "@/lib/db/mongo-client";
import { getAuthDataProvider } from "@/lib/services/auth-provider";
import { findAuthUserByEmail, findAuthUserById } from "@/lib/services/auth-user-repository";
import { getAuthAccessForUser } from "@/lib/services/auth-access";
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/services/auth-security";
import { getAuthUserPageSettings } from "@/lib/services/auth-settings";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/lib/services/auth-security-profile";
import { consumeLoginChallenge } from "@/lib/services/auth-login-challenge";
import { decryptAuthSecret } from "@/lib/utils/auth-encryption";
import { hashRecoveryCode, verifyTotpToken } from "@/lib/services/totp";
import { authConfig } from "./auth.config";

const credentialsProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    otp: { label: "One-time code", type: "text" },
    recoveryCode: { label: "Recovery code", type: "text" },
    challengeId: { label: "Challenge", type: "text" },
  },
  async authorize(credentials, request) {
    try {
      const email = credentials?.email?.toString() ?? "";
      const password = credentials?.password?.toString() ?? "";
      const otp = credentials?.otp?.toString() ?? "";
      const recoveryCode = credentials?.recoveryCode?.toString() ?? "";
      const challengeId = credentials?.challengeId?.toString() ?? "";
      if (!email || !password) {
        console.log("[AUTH] Missing email or password");
        return null;
      }
      const ip = extractClientIp(request);
      const allowed = await checkLoginAllowed({ email, ip });
      if (!allowed.allowed) {
        console.warn("[AUTH] Login blocked due to rate limits", {
          email,
          ip,
          lockedUntil: allowed.lockedUntil?.toISOString(),
        });
        return null;
      }

      if (challengeId) {
        const challenge = await consumeLoginChallenge({
          id: challengeId,
          email,
          ip,
        });
        if (challenge) {
          const user = await findAuthUserById(challenge.userId);
          if (!user) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }

          const security = await getAuthSecurityProfile(user.id);
          const settings = await getAuthUserPageSettings();

          if (security.bannedAt) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (security.disabledAt) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (
            settings.requireEmailVerification &&
            !user.emailVerified
          ) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (security.allowedIps.length > 0 && ip) {
            const allowedSet = new Set(security.allowedIps);
            if (!allowedSet.has(ip)) {
              await recordLoginFailure({ email, ip, request });
              return null;
            }
          }

          if (security.mfaEnabled) {
            const providedRecovery = recoveryCode.trim();
            const providedOtp = otp.trim();
            let mfaOk = false;
            if (providedRecovery) {
              const hashed = hashRecoveryCode(providedRecovery);
              if (security.recoveryCodes.includes(hashed)) {
                const nextCodes = security.recoveryCodes.filter(
                  (code) => code !== hashed
                );
                await updateAuthSecurityProfile(user.id, {
                  recoveryCodes: nextCodes,
                });
                mfaOk = true;
              }
            } else if (providedOtp && security.mfaSecret) {
              const secret = decryptAuthSecret(security.mfaSecret);
              mfaOk = verifyTotpToken(secret, providedOtp);
            }
            if (!mfaOk) {
              await recordLoginFailure({ email, ip, request });
              return null;
            }
          }

          await recordLoginSuccess({ email, ip, request, userId: user.id });
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          };
        }
      }

      console.log("[AUTH] Attempting to find user:", email);
      
      // findAuthUserByEmail uses getAuthDataProvider() internally to choose DB
      let user = await findAuthUserByEmail(email);

      if (!user) {
        console.log("[AUTH] User not found");
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      const security = await getAuthSecurityProfile(user.id);
      const settings = await getAuthUserPageSettings();

      if (security.bannedAt) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (security.disabledAt) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (settings.requireEmailVerification && !user.emailVerified) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (security.allowedIps.length > 0 && ip) {
        const allowedSet = new Set(security.allowedIps);
        if (!allowedSet.has(ip)) {
          await recordLoginFailure({ email, ip, request });
          return null;
        }
      }
      
      if (!user.passwordHash) {
        console.log("[AUTH] User has no password hash");
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      console.log(`[AUTH] User found: ${user.id}. Hash len: ${user.passwordHash.length}. Input pass len: ${password.length}`);
      const isValid = await bcrypt.compare(password, user.passwordHash);
      console.log("[AUTH] Password valid:", isValid);
      
      if (!isValid) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      if (security.mfaEnabled) {
        const providedRecovery = recoveryCode.trim();
        const providedOtp = otp.trim();
        let mfaOk = false;
        if (providedRecovery) {
          const hashed = hashRecoveryCode(providedRecovery);
          if (security.recoveryCodes.includes(hashed)) {
            const nextCodes = security.recoveryCodes.filter(
              (code) => code !== hashed
            );
            await updateAuthSecurityProfile(user.id, {
              recoveryCodes: nextCodes,
            });
            mfaOk = true;
          }
        } else if (providedOtp && security.mfaSecret) {
          const secret = decryptAuthSecret(security.mfaSecret);
          mfaOk = verifyTotpToken(secret, providedOtp);
        }
        if (!mfaOk) {
          await recordLoginFailure({ email, ip, request });
          return null;
        }
      }

      await recordLoginSuccess({ email, ip, request, userId: user.id });

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      };
    } catch (error) {
      console.error("[AUTH] Authorize error:", error);
      return null;
    }
  },
});

const buildProviders = () => {
  const providers: Provider[] = [credentialsProvider];
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  } else {
    console.warn("[AUTH] Google Client ID/Secret not found. Google login will be unavailable.");
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      Facebook({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      })
    );
  } else {
    console.warn("[AUTH] Facebook Client ID/Secret not found. Facebook login will be unavailable.");
  }

  return providers;
};

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  try {
    console.log("[AUTH] Starting configuration...");
    const provider = await getAuthDataProvider();
    console.log("[AUTH] Provider determined:", provider);
    const hasMongo = Boolean(process.env.MONGODB_URI);
    const hasPrisma = Boolean(process.env.DATABASE_URL);

    let adapter;
    if (provider === "mongodb" && hasMongo) {
      adapter = MongoDBAdapter(getMongoClient(), {
        databaseName: process.env.MONGODB_DB ?? "app",
      });
    } else if (provider === "mongodb" && !hasMongo && hasPrisma) {
      console.warn("[AUTH] MongoDB provider selected but MONGODB_URI missing. Falling back to Prisma.");
      adapter = PrismaAdapter(prisma);
    } else if (hasPrisma) {
      adapter = PrismaAdapter(prisma);
    } else {
      adapter = undefined;
    }

    if (!adapter) {
      console.warn("[AUTH] No adapter configured. Environment:", { hasMongo, hasPrisma, provider });
    } else {
      console.log(`[AUTH] Adapter configured for ${provider}.`);
    }

    return {
      ...authConfig,
      ...(adapter && { adapter }),
      providers: buildProviders(),
      callbacks: {
        ...(authConfig.callbacks ?? {}),
        async jwt({ token, user }) {
          const userId = user?.id ?? token.sub;
          if (userId) {
            const access = await getAuthAccessForUser(userId);
            token.role = access.roleId;
            token.permissions = access.permissions;
            token.roleLevel = access.level;
            token.isElevated = access.isElevated;
            const security = await getAuthSecurityProfile(userId);
            token.accountDisabled = Boolean(security.disabledAt);
            token.accountBanned = Boolean(security.bannedAt);
          }
          return token;
        },
        async session({ session, token }) {
          if (session.user) {
            session.user.id = token.sub ?? session.user.id;
            session.user.role = token.role ?? null;
            session.user.permissions = token.permissions ?? [];
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
      debug: true,
    };
  } catch (error) {
    console.error("[AUTH] Configuration error:", error);
    throw error;
  }
});
