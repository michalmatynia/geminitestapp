export const JOB_APPLICATION_APPLY_RUNTIME_KEY = 'job_application_apply' as const;

export const JOB_APPLICATION_APPLY_RUNTIME_NAME = 'Job Application Apply' as const;

export const JOB_APPLICATION_APPLY_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'job_application_input_validate',
  prepareArtifacts: 'job_application_prepare_artifacts',
  sessionPreflight: 'job_application_session_preflight',
  authenticate: 'job_application_authenticate',
  openOffer: 'job_application_open_offer',
  openApplyForm: 'job_application_open_apply_form',
  uploadDocuments: 'job_application_upload_documents',
  reviewOrSubmit: 'job_application_review_or_submit',
  browserClose: 'browser_close',
} as const;

export const JOB_APPLICATION_APPLY_RUNTIME_STEP_IDS = [
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.browserPreparation,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.browserOpen,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.inputValidate,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.prepareArtifacts,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.sessionPreflight,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.authenticate,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.openOffer,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.openApplyForm,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.uploadDocuments,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.reviewOrSubmit,
  JOB_APPLICATION_APPLY_RUNTIME_STEPS.browserClose,
] as const;

export type JobApplicationApplyRuntimeStepId =
  (typeof JOB_APPLICATION_APPLY_RUNTIME_STEP_IDS)[number];
