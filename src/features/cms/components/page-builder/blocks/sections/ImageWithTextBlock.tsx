export function ImageWithTextBlock({ block }: { block: any }) {
  const settings = block.settings;
  const image = settings['image'] as string;
  const title = settings['title'] as string;
  const text = settings['text'] as string;

  return (
    <div className='grid grid-cols-2 gap-6 items-center'>
      {image && <img src={image} alt={title} className='rounded-lg' />}
      <div className='space-y-2'>
        <h3 className='text-xl font-bold'>{title}</h3>
        <p className='text-gray-400'>{text}</p>
      </div>
    </div>
  );
}
