import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compare } from "bcryptjs";
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
    const email = credentials?.email?.toString() ?? "";
    const password = credentials?.password?.toString() ?? "";
    if (!email || !password) {
      console.log("[AUTH] Missing email or password");
      return null;
    }

    console.log("[AUTH] Attempting to find user:", email);
    const user = await findAuthUserByEmail(email);
    if (!user) {
      console.log("[AUTH] User not found");
      return null;
    }
    
    if (!user.passwordHash) {
      console.log("[AUTH] User has no password hash");
      return null;
    }

    const isValid = await compare(password, user.passwordHash);
    console.log("[AUTH] Password valid:", isValid);
    
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
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
  }
  return providers;
};

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const provider = await getAuthDataProvider();
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
    throw new Error("No auth adapter configured.");
  }

  return {
    ...authConfig,
    adapter,
    providers: buildProviders(),
  };
});