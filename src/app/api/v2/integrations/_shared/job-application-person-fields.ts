import { badRequestError } from '@/shared/errors/app-error';

export type JobApplicationPersonFields = {
  jobApplicationPersonId?: string | null;
  jobApplicationPersonName?: string | null;
};

const resolvePersonDisplayName = (person: {
  firstName?: string;
  fullName?: string;
  id: string;
  lastName?: string;
}): string => {
  const fullName = person.fullName?.trim() ?? '';
  if (fullName.length > 0) return fullName;
  const name = [person.firstName, person.lastName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join(' ');
  return name.length > 0 ? name : person.id;
};

export const resolveJobApplicationPersonFields = async (
  personId: string | null | undefined
): Promise<JobApplicationPersonFields> => {
  if (personId === undefined) return {};
  const normalizedPersonId = personId?.trim() ?? '';
  if (normalizedPersonId.length === 0) {
    return {
      jobApplicationPersonId: null,
      jobApplicationPersonName: null,
    };
  }

  const { getMongoFilemakerPersonById } = await import('@/features/filemaker/server');
  const person = await getMongoFilemakerPersonById(normalizedPersonId);
  if (!person) {
    throw badRequestError('Selected person profile was not found.', {
      jobApplicationPersonId: normalizedPersonId,
    });
  }

  return {
    jobApplicationPersonId: person.id,
    jobApplicationPersonName: resolvePersonDisplayName(person),
  };
};
