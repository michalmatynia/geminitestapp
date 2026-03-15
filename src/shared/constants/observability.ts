export const ActivityTypes = {
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    REGISTERED: 'auth.registered',
  },
  KANGUR: {
    LEARNER_SIGNIN: 'kangur.learner_signin',
    LEARNER_SIGNOUT: 'kangur.learner_signout',
    LEARNER_SESSION: 'kangur.learner_session',
    LESSON_PANEL_CTA: 'kangur.lesson_panel_cta',
    OPENED_TASK: 'kangur.opened_task',
    LESSON_PANEL_ACTIVITY: 'kangur.lesson_panel_activity',
  },
  INTEGRATION: {
    UPDATED: 'integration.updated',
    CONNECTION_CREATED: 'integration.connection_created',
    CONNECTION_UPDATED: 'integration.connection_updated',
    CONNECTION_DELETED: 'integration.connection_deleted',
  },
  CMS: {
    PAGE_CREATED: 'cms.page_created',
    PAGE_UPDATED: 'cms.page_updated',
    PAGE_DELETED: 'cms.page_deleted',
    THEME_CREATED: 'cms.theme_created',
    THEME_UPDATED: 'cms.theme_updated',
    THEME_DELETED: 'cms.theme_deleted',
  },
  PRODUCT: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    DUPLICATED: 'product.duplicated',
    DELETED: 'product.deleted',
  },
  NOTE: {
    CREATED: 'note.created',
    UPDATED: 'note.updated',
    DELETED: 'note.deleted',
  },
  SYSTEM: {
    DATABASE_SYNC: 'system.database_sync',
  },
} as const;
