import { JSX } from "react";
import { CmsHomePage } from "@/features/cms";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return <CmsHomePage />;
}
