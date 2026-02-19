import type { 
  JobDto,
  JobStatusDto,
  JobRowDataDto,
  ProductAiJobDto, 
  ProductAiJobTypeDto, 
  ProductAiJobResultDto,
  CreateProductAiJobDto,
  UpdateProductAiJobDto
} from '../../contracts/jobs';

export type { 
  JobDto,
  JobStatusDto,
  JobRowDataDto,
  ProductAiJobDto, 
  ProductAiJobTypeDto, 
  ProductAiJobResultDto,
  CreateProductAiJobDto,
  UpdateProductAiJobDto
};

export type ProductAiJobType = ProductAiJobTypeDto;

export type ProductAiJobResult = ProductAiJobResultDto;

/**
 * AI job record for a product.
 * Inherits standard fields from ProductAiJobDto.
 */
export type ProductAiJob = ProductAiJobDto;
