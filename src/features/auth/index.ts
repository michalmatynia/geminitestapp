// Public client-safe API for the auth feature.
export { default as AuthHomePage } from './pages/admin/AuthHomePage';
export { default as AuthDashboardPage } from './pages/admin/DashboardPage';
export { default as AuthPermissionsPage } from './pages/admin/PermissionsPage';
export { default as AuthSettingsPage } from './pages/admin/SettingsPage';
export { default as AuthUserPagesPage } from './pages/admin/UserPagesPage';
export { default as AuthUsersPage } from './pages/admin/UsersPage';
export { default as RegisterPage } from './pages/public/RegisterPage';
export { default as SignInPage } from './pages/public/SignInPage';
export * from './context/AuthContext';
export * from './hooks/useUserPreferences';
export * from '@/shared/contracts/auth';
export type { AuthPermission, AuthRole, AuthUserRoleMap } from './utils/auth-management';
export * from './utils/auth-management';
export type { AuthSecurityPolicy } from './utils/auth-security';
export * from './utils/auth-security';
export type { AuthUserPageSettings } from './utils/auth-user-pages';
export * from './utils/auth-user-pages';
