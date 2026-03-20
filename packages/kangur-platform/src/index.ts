export type KangurStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type KangurNavigationAdapter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

export type KangurAuthSession = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type KangurAuthAdapter = {
  getSession: () => Promise<KangurAuthSession | null>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type KangurRuntimePlatform = {
  auth: KangurAuthAdapter;
  navigation: KangurNavigationAdapter;
  storage: KangurStorageAdapter;
};
