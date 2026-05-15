'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import {
  generateEditorialArticleFromAiPath,
  type EditorialArticleAiGenerateInput,
  type EditorialArticleState,
  type GeneratedEditorialArticleState,
} from './editorial-articles-cms.client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  Button,
  Input,
  Label,
  Textarea,
  useToast,
} from '@/shared/ui/primitives.public';

type EditorialArticleAiPathGeneratorProps = {
  disabled: boolean;
  draft: EditorialArticleState;
  onGenerated: (article: GeneratedEditorialArticleState) => void;
};

type GeneratorController = {
  canGenerate: boolean;
  handleGenerateClick: () => void;
  imageUrl: string;
  isGenerating: boolean;
  prompt: string;
  setImageUrl: (value: string) => void;
  setPrompt: (value: string) => void;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const useEditorialArticleAiGenerator = ({
  disabled,
  draft,
  onGenerated,
}: EditorialArticleAiPathGeneratorProps): GeneratorController => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const generateMutation = createMutationV2<
    GeneratedEditorialArticleState,
    EditorialArticleAiGenerateInput
  >({
    mutationKey: ['products', 'ecommerce-pages-cms', 'editorial-articles', 'generate'],
    mutationFn: generateEditorialArticleFromAiPath,
    onSuccess: (article: GeneratedEditorialArticleState): void => {
      onGenerated(article);
      toast('Article generated with Gemma Vision.', { variant: 'success' });
    },
    onError: (error: Error): void => {
      toast(toErrorMessage(error), { variant: 'error' });
    },
    meta: {
      source: 'products.ecommercePagesCms.editorialArticles.generate',
      operation: 'action',
      resource: 'products.ecommerce-pages-cms.editorial-article-generate',
      errorPresentation: 'toast',
    },
  });
  const canGenerate = prompt.trim().length > 0 && !disabled;

  const handleGenerateClick = (): void => {
    if (!canGenerate || generateMutation.isPending) return;
    const trimmedImageUrl = imageUrl.trim();
    generateMutation.mutate({
      draft: {
        body: draft.body,
        excerpt: draft.excerpt,
        tag: draft.tag,
        title: draft.title,
      },
      ...(trimmedImageUrl.length > 0 ? { imageUrl: trimmedImageUrl } : {}),
      prompt,
    });
  };

  return {
    canGenerate,
    handleGenerateClick,
    imageUrl,
    isGenerating: generateMutation.isPending,
    prompt,
    setImageUrl,
    setPrompt,
  };
};

export function EditorialArticleAiPathGenerator(
  props: EditorialArticleAiPathGeneratorProps
): React.JSX.Element {
  const controller = useEditorialArticleAiGenerator(props);

  return (
    <div className='rounded-md border bg-muted/20 p-3'>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)]'>
        <AiPromptField controller={controller} disabled={props.disabled} />
        <AiContextImageField controller={controller} disabled={props.disabled} />
      </div>
    </div>
  );
}

function AiPromptField({
  controller,
  disabled,
}: {
  controller: GeneratorController;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='new-lore-article-ai-prompt'>AI prompt</Label>
      <Textarea
        id='new-lore-article-ai-prompt'
        value={controller.prompt}
        rows={3}
        disabled={disabled || controller.isGenerating}
        onChange={(event) => controller.setPrompt(event.target.value)}
      />
    </div>
  );
}

function AiContextImageField({
  controller,
  disabled,
}: {
  controller: GeneratorController;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='new-lore-article-ai-image-url'>Context image URL</Label>
      <Input
        id='new-lore-article-ai-image-url'
        value={controller.imageUrl}
        disabled={disabled || controller.isGenerating}
        onChange={(event) => controller.setImageUrl(event.target.value)}
      />
      <Button
        type='button'
        variant='outline'
        className='w-full justify-center'
        disabled={!controller.canGenerate || controller.isGenerating}
        onClick={controller.handleGenerateClick}
      >
        {controller.isGenerating ? (
          <Loader2 className='mr-2 size-4 animate-spin' />
        ) : (
          <Sparkles className='mr-2 size-4' />
        )}
        Generate article
      </Button>
    </div>
  );
}
