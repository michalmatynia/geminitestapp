import React, { createContext, useContext, useEffect, useState } from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';

const AuthContext = createContext();
const kangurPlatform = getKangurPlatform();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  const checkAppState = async () => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const currentUser = await kangurPlatform.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (error && (error.status === 401 || error.status === 403)) {
        // Anonymous mode is allowed; authentication is optional.
        setAuthError(null);
      } else {
        setAuthError({
          type: 'unknown',
          message: error?.message || 'Authentication check failed',
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    void checkAppState();
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      void kangurPlatform.auth.logout(window.location.href);
      return;
    }
    void kangurPlatform.auth.logout();
  };

  const navigateToLogin = () => {
    kangurPlatform.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
