import { z } from 'zod';

export const AI_PATHS_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'restore_static_recovery_bundle',
  'ensure_starter_workflow_defaults',
  'refresh_starter_workflow_configs',
  'normalize_runtime_kernel_settings',
] as const;
export const aiPathsMaintenanceActionIdSchema = z.enum(AI_PATHS_MAINTENANCE_ACTION_IDS);
export type AiPathsMaintenanceActionId = (typeof AI_PATHS_MAINTENANCE_ACTION_IDS)[number];

export const aiPathsMaintenanceActionStatusSchema = z.enum(['pending', 'ready']);

export const aiPathsMaintenanceActionReportSchema = z.object({
  id: aiPathsMaintenanceActionIdSchema,
  title: z.string(),
  description: z.string(),
  blocking: z.boolean(),
  status: aiPathsMaintenanceActionStatusSchema,
  affectedRecords: z.number().int().nonnegative(),
});
export type AiPathsMaintenanceActionReport = z.infer<typeof aiPathsMaintenanceActionReportSchema>;

export const aiPathsMaintenanceReportSchema = z.object({
  scannedAt: z.string(),
  pendingActions: z.number().int().nonnegative(),
  blockingActions: z.number().int().nonnegative(),
  actions: z.array(aiPathsMaintenanceActionReportSchema),
});
export type AiPathsMaintenanceReport = z.infer<typeof aiPathsMaintenanceReportSchema>;

export const aiPathsMaintenanceApplyResultSchema = z.object({
  appliedActionIds: z.array(aiPathsMaintenanceActionIdSchema),
  report: aiPathsMaintenanceReportSchema,
});
export type AiPathsMaintenanceApplyResult = z.infer<typeof aiPathsMaintenanceApplyResultSchema>;

export const AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS = ['normalize_runtime_kernel_mode'] as const;
export type AiPathsMaintenanceCompatActionId =
  (typeof AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS)[number];
export const aiPathsMaintenanceCompatActionIdSchema = z.enum(
  AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS
);

export const aiPathsMaintenanceApplyRequestSchema = z.object({
  actionIds: z.array(
    z.union([aiPathsMaintenanceActionIdSchema, aiPathsMaintenanceCompatActionIdSchema])
  ).optional(),
});
export type AiPathsMaintenanceApplyRequest = z.infer<typeof aiPathsMaintenanceApplyRequestSchema>;
