export interface Project {
  code: string;
  name: string;
  projectType: string;
  city: string;
  country: string;
  stats: string[];
  description: string;
  order: number;
  status: 'published' | 'draft';
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget:   { x: number; y: number; z: number };
}

export interface Service {
  code: string;
  title: string;
  description: string;
  order: number;
}

export interface Inquiry {
  email: string;
  createdAt: Date;
  status: 'pending' | 'contacted';
  source: string;
}
