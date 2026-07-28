import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Indique al menos un archivo SQL.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está configurada.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

try {
  await client.connect();
  for (const file of files) {
    const sql = await readFile(file, "utf8");
    await client.query(sql);
    console.log(`OK ${file}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Error SQL");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
