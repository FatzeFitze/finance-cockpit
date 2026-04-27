import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create expenses table',
    up: async (db) => {
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
          created_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: 'add receipt columns to expenses',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE expenses ADD COLUMN receipt_uri TEXT;
        ALTER TABLE expenses ADD COLUMN receipt_name TEXT;
        ALTER TABLE expenses ADD COLUMN receipt_mime_type TEXT;
      `);
    },
  },
  {
    version: 3,
    name: 'create recurring expenses table',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_expenses (
          id TEXT PRIMARY KEY NOT NULL,
          merchant TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          frequency TEXT NOT NULL,
          day_of_month INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          last_generated_month TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 4,
    name: 'create tags and expense_tags tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          normalized_name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expense_tags (
          expense_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (expense_id, tag_id)
        );
      `);
    },
  },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const latestVersion = migrations[migrations.length - 1]?.version ?? 0;

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  while (currentDbVersion < latestVersion) {
    const nextMigration = migrations.find(
      (migration) => migration.version === currentDbVersion + 1
    );

    if (!nextMigration) {
      throw new Error(`Missing migration for version ${currentDbVersion + 1}`);
    }

    await nextMigration.up(db);
    await db.execAsync(`PRAGMA user_version = ${nextMigration.version}`);

    currentDbVersion = nextMigration.version;
  }
}