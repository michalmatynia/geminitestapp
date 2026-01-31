import type { JSX } from "react";

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  return (
    <div>{children}</div>
  );
}
