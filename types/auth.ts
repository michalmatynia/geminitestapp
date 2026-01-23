export type AuthDbProvider = "prisma" | "mongodb";

export type AuthUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: string | null;
  provider: AuthDbProvider;
};
