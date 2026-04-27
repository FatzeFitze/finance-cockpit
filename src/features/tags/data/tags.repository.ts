import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeTagKey, normalizeTagName } from '../model/tag.logic';
import type { Tag } from '../model/tag.types';

type TagRow = {
  id: string;
  name: string;
};

export async function listTags(db: SQLiteDatabase): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>(
    `SELECT id, name
     FROM tags
     ORDER BY name COLLATE NOCASE ASC`
  );

  return rows;
}

export async function createTag(db: SQLiteDatabase, rawName: string): Promise<Tag> {
  const name = normalizeTagName(rawName);
  const normalizedName = normalizeTagKey(name);

  if (!name) {
    throw new Error('Tag name cannot be empty.');
  }

  const id = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT OR IGNORE INTO tags (id, name, normalized_name, created_at)
     VALUES (?, ?, ?, ?)`,
    id,
    name,
    normalizedName,
    createdAt
  );

  const tag = await db.getFirstAsync<TagRow>(
    `SELECT id, name
     FROM tags
     WHERE normalized_name = ?`,
    normalizedName
  );

  if (!tag) {
    throw new Error('Could not create or load tag.');
  }

  return tag;
}