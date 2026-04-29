import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';

export type HomeScreenAuthActionsViewModel = {
  handleSignIn: () => void;
  handleSignInWithLearnerCredentials: (l: string, p: string) => Promise<void>;
  handleSignOut: () => void;
};

export function useHomeScreenAuthActions(): HomeScreenAuthActionsViewModel {
  const { signIn, signInWithLearnerCredentials, signOut } = useKangurMobileAuth();

  return {
    handleSignIn: () => {
      void signIn();
    },
    handleSignInWithLearnerCredentials: async (l: string, p: string) => {
      await signInWithLearnerCredentials(l, p);
    },
    handleSignOut: () => {
      void signOut();
    },
  };
}
