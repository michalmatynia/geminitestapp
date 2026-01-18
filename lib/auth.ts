import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getMongoClient } from "@/lib/db/mongo-client";
import { getAuthDataProvider } from "@/lib/services/auth-provider";
import { findAuthUserByEmail } from "@/lib/services/auth-user-repository";
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
      const user = await findAuthUserByEmail(email);

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
        name: user.name,
        image: user.image,
      };
    } catch (error) {
      console.error("[AUTH] Authorize error:", error);
      return null;
    }
  },
});

const buildProviders = () => {
  const providers = [credentialsProvider];
  
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
      adapter,
      providers: buildProviders(),
      debug: true, 
    };
  } catch (error) {
    console.error("[AUTH] Configuration error:", error);
    throw error;
  }
});
