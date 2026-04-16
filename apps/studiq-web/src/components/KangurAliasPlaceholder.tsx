import type { ReactNode } from 'react';

type KangurAliasPlaceholderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export default function KangurAliasPlaceholder({
  title,
  description,
  children,
}: KangurAliasPlaceholderProps): ReactNode {
  return (
    <section
      aria-labelledby='kangur-alias-placeholder-title'
      className='kangur-alias-placeholder'
    >
      <h1 id='kangur-alias-placeholder-title'>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}
