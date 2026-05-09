/**
 * Activity Types for Observability and Analytics
 * 
 * Standardized activity type constants for tracking user actions and system events.
 * Used for analytics, audit logs, and observability across the platform.
 */
export const ActivityTypes = {
  /** Authentication-related activities */
  AUTH: {
    LOGIN: 'auth.login',                    // User successfully logged in
    LOGOUT: 'auth.logout',                  // User logged out
    REGISTERED: 'auth.registered',          // New user registration completed
  },
  /** Kangur educational platform activities */
  KANGUR: {
    LEARNER_SIGNIN: 'kangur.learner_signin',           // Learner signed into Kangur
    LEARNER_SIGNOUT: 'kangur.learner_signout',         // Learner signed out of Kangur
    LEARNER_SESSION: 'kangur.learner_session',         // Learner session activity
    LESSON_PANEL_CTA: 'kangur.lesson_panel_cta',       // Lesson panel call-to-action clicked
    OPENED_TASK: 'kangur.opened_task',                 // Learner opened a task/exercise
    LESSON_PANEL_ACTIVITY: 'kangur.lesson_panel_activity', // General lesson panel interaction
  },
  /** Integration management activities */
  INTEGRATION: {
    UPDATED: 'integration.updated',                     // Integration settings updated
    CONNECTION_CREATED: 'integration.connection_created',   // New integration connection created
    CONNECTION_UPDATED: 'integration.connection_updated',   // Integration connection modified
    CONNECTION_DELETED: 'integration.connection_deleted',   // Integration connection removed
  },
  /** Content Management System activities */
  CMS: {
    PAGE_CREATED: 'cms.page_created',       // New CMS page created
    PAGE_UPDATED: 'cms.page_updated',       // CMS page content updated
    PAGE_DELETED: 'cms.page_deleted',       // CMS page deleted
    THEME_CREATED: 'cms.theme_created',     // New CMS theme created
    THEME_UPDATED: 'cms.theme_updated',     // CMS theme modified
    THEME_DELETED: 'cms.theme_deleted',     // CMS theme removed
  },
  /** Product management activities */
  PRODUCT: {
    CREATED: 'product.created',             // New product created
    UPDATED: 'product.updated',             // Product information updated
    DUPLICATED: 'product.duplicated',       // Product duplicated/cloned
    DELETED: 'product.deleted',             // Product removed
  },
  /** Note-taking activities */
  NOTE: {
    CREATED: 'note.created',                // New note created
    UPDATED: 'note.updated',                // Note content updated
    DELETED: 'note.deleted',                // Note deleted
  },
  /** System-level activities */
  SYSTEM: {
    DATABASE_SYNC: 'system.database_sync',
  },
} as const;
