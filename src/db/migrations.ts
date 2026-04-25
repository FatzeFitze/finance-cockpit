import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        merchant TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        receipt_uri TEXT,
        receipt_name TEXT,
        receipt_mime_type TEXT
      );
    `);

    currentDbVersion = 2;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(`
      ALTER TABLE expenses ADD COLUMN receipt_uri TEXT;
      ALTER TABLE expenses ADD COLUMN receipt_name TEXT;
      ALTER TABLE expenses ADD COLUMN receipt_mime_type TEXT;
    `);

    currentDbVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}