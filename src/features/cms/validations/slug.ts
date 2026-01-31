export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidSlug = (value: string): boolean => SLUG_REGEX.test(value);
