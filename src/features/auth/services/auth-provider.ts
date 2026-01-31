import "server-only";

type AuthDbProvider = "mongodb";

// Auth provider must be deterministic and never fail. Auth data is Mongo-first.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  if (!process.env.MONGODB_URI) {
    console.warn("[auth-provider] MONGODB_URI missing; auth will not persist.");
  }
  return "mongodb";
};
