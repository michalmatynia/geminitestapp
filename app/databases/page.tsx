import fs from "fs/promises";
import path from "path";

export default async function DatabasesPage() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  let stats;
  try {
    stats = await fs.stat(dbPath);
  } catch (error) {
    console.error(error);
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Database</h1>
      <div className="bg-gray-950 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">dev.db</h2>
        {stats && (
          <ul>
            <li>Size: {(stats.size / 1024).toFixed(2)} KB</li>
            <li>Created: {stats.birthtime.toLocaleString()}</li>
            <li>Last Modified: {stats.mtime.toLocaleString()}</li>
          </ul>
        )}
        {!stats && <p>Database file not found.</p>}
      </div>
    </div>
  );
}
