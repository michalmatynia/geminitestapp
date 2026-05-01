import type { Collection } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerJobApplicationMongoDocument } from './filemaker-job-application-repository.types';

export const FILEMAKER_JOB_APPLICATIONS_COLLECTION = 'filemaker_job_applications';

export const getFilemakerJobApplicationsCollection = async (): Promise<
  Collection<FilemakerJobApplicationMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerJobApplicationMongoDocument>(
    FILEMAKER_JOB_APPLICATIONS_COLLECTION
  );
};
