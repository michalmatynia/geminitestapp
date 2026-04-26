import { internalError } from '@/shared/errors/app-error';

export const TRADERA_TITLE_MAX_CHARACTERS = 80;

const countCharacters = (value: string): number => Array.from(value).length;

const truncateCharacters = (value: string, limit: number): string =>
  Array.from(value).slice(0, limit).join('');

export const buildTraderaTitleTooLongFailureMessage = (
  titleLength: number
): string =>
  `FAIL_PUBLISH_VALIDATION: Tradera title is ${titleLength} characters, but Tradera allows at most ${TRADERA_TITLE_MAX_CHARACTERS}. Shorten the marketplace title before retrying.`;

export const assertTraderaListingTitleWithinLimit = ({
  title,
  productId,
  listingId,
  connectionId,
}: {
  title: string;
  productId: string;
  listingId: string;
  connectionId: string;
}): void => {
  const titleLength = countCharacters(title);
  if (titleLength <= TRADERA_TITLE_MAX_CHARACTERS) {
    return;
  }

  throw internalError(buildTraderaTitleTooLongFailureMessage(titleLength), {
    failureCode: 'tradera_title_too_long',
    productId,
    listingId,
    connectionId,
    titleLength,
    titleMaxLength: TRADERA_TITLE_MAX_CHARACTERS,
    titlePreview: truncateCharacters(title, 160),
  });
};
