export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidSlug = (value: string) => SLUG_REGEX.test(value);
