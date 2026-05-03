import 'server-only';

import { type ProductRepository } from '@/shared/contracts/products/drafts';

import { mongoProductRepository as modularMongoProductRepository } from './mongo';

export const mongoProductRepository: ProductRepository = modularMongoProductRepository;
