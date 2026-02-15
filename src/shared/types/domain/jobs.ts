import type { ProductAiJobDto, ProductAiJobTypeDto, ProductAiJobResultDto } from '../../contracts/jobs';

export type { ProductAiJobDto, ProductAiJobTypeDto, ProductAiJobResultDto };

export type ProductAiJobType = ProductAiJobTypeDto;

export type ProductAiJobResult = ProductAiJobResultDto;

/**
 * AI job record for a product.
 * Inherits standard fields from ProductAiJobDto.
 */
export type ProductAiJob = ProductAiJobDto;
