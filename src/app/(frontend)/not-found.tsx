import { Button } from "@/shared/ui";
import Link from "next/link";

export default function FrontendNotFound(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-200">
      <h1 className="text-2xl font-semibold text-gray-100">Page not found</h1>
      <p className="max-w-md text-sm text-gray-400">
        We couldn&apos;t find what you&apos;re looking for.
      </p>
      <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
