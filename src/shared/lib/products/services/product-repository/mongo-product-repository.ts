import 'server-only';

import { ProductRepository } from '@/shared/contracts/products';

import { mongoProductRepository as modularMongoProductRepository } from './mongo';

export const mongoProductRepository: ProductRepository = modularMongoProductRepository;
