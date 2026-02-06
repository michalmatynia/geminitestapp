import type { JSX } from 'react';

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>{children}</div>
  );
}
