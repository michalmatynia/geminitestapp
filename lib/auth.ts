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
import { findAuthUserByEmail } from "@/lib/services/auth-user-repository";
import { getAuthAccessForUser } from "@/lib/services/auth-access";
import { authConfig } from "./auth.config";

const credentialsProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    try {
      const email = credentials?.email?.toString() ?? "";
      const password = credentials?.password?.toString() ?? "";
      if (!email || !password) {
        console.log("[AUTH] Missing email or password");
        return null;
      }

      console.log("[AUTH] Attempting to find user:", email);
      
      // findAuthUserByEmail uses getAuthDataProvider() internally to choose DB
      let user = await findAuthUserByEmail(email);

      // Development bypass for easy access
      if (process.env.NODE_ENV === "development" && password === "admin123") {
         console.log("[AUTH] Checking development bypass for:", email);
         
         if (user) {
             console.log("[AUTH] User found in DB. Bypassing password check (Development).");
             return {
                id: user.id,
                email: user.email,
                name: user.name ?? null,
                image: user.image ?? null,
             };
         }
         
         if (email === "admin@example.com") {
             console.log("[AUTH] Admin user NOT found in DB. Creating auto-admin for development...");
             try {
                const provider = await getAuthDataProvider();
                const hashedPassword = await bcrypt.hash("admin123", 10);
                
                if (provider === "mongodb") {
                   const { getMongoDb } = await import("@/lib/db/mongo-client");
                   const db = await getMongoDb();
                   const result = await db.collection("users").insertOne({
                      email: "admin@example.com",
                      name: "Admin User",
                      passwordHash: hashedPassword,
                      createdAt: new Date(),
                      updatedAt: new Date()
                   });
                   return {
                      id: result.insertedId.toString(),
                      email: "admin@example.com",
                      name: "Admin User",
                      image: null
                   };
                } else {
                   const newUser = await prisma.user.create({
                      data: {
                         email: "admin@example.com",
                         name: "Admin User",
                         passwordHash: hashedPassword
                      }
                   });
                   return {
                      id: newUser.id,
                      email: newUser.email,
                      name: newUser.name,
                      image: newUser.image
                   };
                }
             } catch (err) {
                 console.error("[AUTH] Failed to create auto-admin:", err);
             }
         }
      }

      if (!user) {
        console.log("[AUTH] User not found");
        return null;
      }
      
      if (!user.passwordHash) {
        console.log("[AUTH] User has no password hash");
        return null;
      }

      console.log(`[AUTH] User found: ${user.id}. Hash len: ${user.passwordHash.length}. Input pass len: ${password.length}`);
      const isValid = await bcrypt.compare(password, user.passwordHash);
      console.log("[AUTH] Password valid:", isValid);
      
      if (!isValid) return null;

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

export const { handlers, auth: originalAuth, signIn, signOut } = NextAuth(async () => {
  try {
    console.log("[AUTH] Starting configuration...");
    const provider = await getAuthDataProvider();
    console.log("[AUTH] Provider determined:", provider);
    const hasMongo = Boolean(process.env.MONGODB_URI);
    const hasPrisma = Boolean(process.env.DATABASE_URL);

    const adapter =
      provider === "mongodb" && hasMongo
        ? MongoDBAdapter(getMongoClient(), {
            databaseName: process.env.MONGODB_DB ?? "app",
          })
        : hasPrisma
        ? PrismaAdapter(prisma)
        : undefined;

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
          }
          return token;
        },
        async session({ session, token }) {
          if (session.user) {
            session.user.id = token.sub ?? session.user.id;
            session.user.role = token.role ?? null;
            session.user.permissions = token.permissions ?? [];
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

// Wrapper for auth to provide mock session in dev
export const auth = async (...args: any[]) => {
  const session = await originalAuth(...args);
  
  if (!session?.user && process.env.NODE_ENV === "development") {
      console.log("[AUTH] Mocking Admin Session (Dev Mode)");
      // Check if we can find a real admin user to use for the ID
      // This is helpful if you want to attach data to a real user even in "no-auth" mode.
      // But for "access as regular admin", a fixed mock is safer and faster.
      return {
          user: {
              id: "admin-mock-id", // Use a fixed ID so data might not persist if reliant on real DB ID
              name: "Admin User (Mock)",
              email: "admin@example.com",
              role: "admin",
              permissions: ["*"], // Wildcard or list all
              image: null
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
  }
  
  return session;
};
