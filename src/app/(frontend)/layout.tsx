import Link from "next/link";

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="bg-gray-900 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <Link href="/" className="font-bold">
            My Shop
          </Link>
          <div className="space-x-4">
            <Link href="/">Home</Link>
          </div>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
