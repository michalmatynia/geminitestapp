import type { 
  Producer 
} from '@/shared/contracts/products';

export type ProducerFilters = {
  search?: string;
};

export type ProducerRepository = {
  listProducers(filters: ProducerFilters): Promise<Producer[]>;
  getProducerById(id: string): Promise<Producer | null>;
  createProducer(data: { name: string; website?: string | null }): Promise<Producer>;
  updateProducer(id: string, data: { name?: string; website?: string | null }): Promise<Producer>;
  deleteProducer(id: string): Promise<void>;
  findByName(name: string): Promise<Producer | null>;
};
