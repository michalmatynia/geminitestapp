import 'server-only';

import { readDocsSourceText } from '../docs-registry-adapter.file-access';
import {
  hashText,
} from '../docs-registry-adapter.helpers';
import {
  type AiPathsDocAssertion,
  type AiPathsDocsManifestSource,
} from '../docs-registry-adapter.types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { extractAiPathsAssertionsFromMarkdown } from './assertion-markdown';

export const buildMarkdownSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  try {
    const content = await readDocsSourceText(source.path);
    const hash = hashText(content);
    const extracted = extractAiPathsAssertionsFromMarkdown(content, source.path, hash);
    extracted.warnings.forEach((warning) => warnings.push(warning));
    return {
      hash,
      assertions: extracted.assertions,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    warnings.push(
      `${source.path}: failed to read markdown source (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};
