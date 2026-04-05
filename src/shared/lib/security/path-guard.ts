import path from 'path';
import { badRequestError } from '@/shared/errors/app-error';

/**
 * Hardens filesystem path operations by ensuring that user/dynamic input 
 * does not result in path traversal outside an expected root directory.
 */
export const getSecurePath = (root: string, userInput: string): string => {
  const normalizedRoot = path.resolve(root);
  const fullPath = path.resolve(normalizedRoot, userInput);

  if (!fullPath.startsWith(normalizedRoot + path.sep) && fullPath !== normalizedRoot) {
    throw badRequestError('Invalid filesystem path access attempt');
  }

  return fullPath;
};
