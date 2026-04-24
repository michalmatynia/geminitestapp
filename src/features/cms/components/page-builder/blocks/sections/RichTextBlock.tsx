export function RichTextBlock({ block }: { block: any }) {
  const settings = block.settings;
  const content = settings['content'] as string;

  return (
    <div className='prose prose-invert max-w-none'>
      {content || <p className='text-gray-500 italic'>Empty rich text block...</p>}
    </div>
  );
}
