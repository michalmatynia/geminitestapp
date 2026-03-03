import 'server-only';

import { mongoProductRepository as modularMongoProductRepository } from './mongo';
import { ProductRepository } from '@/shared/contracts/products';

export const mongoProductRepository: ProductRepository = modularMongoProductRepository;
