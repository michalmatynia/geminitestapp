// Re-export DTOs as types for backward compatibility
export type {
  JobDto,
  ProductAiJobDto,
  CreateJobDto,
  UpdateJobDto,
  JobQueueStatsDto,
  CreateProductAiJobDto
} from "@/shared/dtos";

export type ProductAiJobsPanelProps = {
  title?: string;
  description?: string;
  showTabs?: boolean;
  embedded?: boolean;
};
