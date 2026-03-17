'use client';

import { createContext, useContext } from 'react';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';

export type KangurLoginPageProps = {
  callbackUrl?: string;
  defaultCallbackUrl: string;
  onClose?: () => void;
  parentAuthMode?: KangurAuthMode;
  showParentAuthModeTabs?: boolean;
};

export const KangurLoginPagePropsContext = createContext<KangurLoginPageProps | null>(null);

export const useKangurLoginPageProps = (): KangurLoginPageProps => {
  const value = useContext(KangurLoginPagePropsContext);
  if (!value) {
    throw new Error('KangurLoginPage props are unavailable.');
  }
  return value;
};
