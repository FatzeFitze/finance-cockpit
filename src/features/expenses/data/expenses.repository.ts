import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tag } from '../../tags/model/tag.types';
import type { CreateExpenseInput, Expense, ExpenseCategory } from '../model/expense.types';

type ExpenseRow = {
  id: string;
  merchant: string;
  amount: number;
  currency: 'EUR' | 'USD';
  date: string;
  category: string;
  note: string | null;
  created_at: string;
  receipt_uri: string | null;
  receipt_name: string | null;
  receipt_mime_type: string | null;
};

type ExpenseTagRow = {
  expense_id: string;
  tag_id: string;
  tag_name: string;
};

function mapRowToExpense(row: ExpenseRow, tags: Tag[]): Expense {
  return {
    id: row.id,
    merchant: row.merchant,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    category: row.category as ExpenseCategory,
    note: row.note,
    createdAt: row.created_at,
    receiptUri: row.receipt_uri,
    receiptName: row.receipt_name,
    receiptMimeType: row.receipt_mime_type,
    tags,
  };
}

async function loadTagsByExpenseId(
  db: SQLiteDatabase,
  expenseIds: string[]
): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();

  if (expenseIds.length === 0) {
    return result;
  }

  const placeholders = expenseIds.map(() => '?').join(', ');

  const rows = await db.getAllAsync<ExpenseTagRow>(
    `SELECT et.expense_id, t.id as tag_id, t.name as tag_name
     FROM expense_tags et
     JOIN tags t ON t.id = et.tag_id
     WHERE et.expense_id IN (${placeholders})
     ORDER BY t.name COLLATE NOCASE ASC`,
    ...expenseIds
  );

  for (const row of rows) {
    const current = result.get(row.expense_id) ?? [];
    current.push({
      id: row.tag_id,
      name: row.tag_name,
    });
    result.set(row.expense_id, current);
  }

  return result;
}

async function syncExpenseTags(
  db: SQLiteDatabase,
  expenseId: string,
  tagIds: string[]
): Promise<void> {
  const uniqueTagIds = Array.from(new Set(tagIds));

  await db.execAsync('BEGIN');

  try {
    await db.runAsync(`DELETE FROM expense_tags WHERE expense_id = ?`, expenseId);

    for (const tagId of uniqueTagIds) {
      await db.runAsync(
        `INSERT INTO expense_tags (expense_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
        expenseId,
        tagId,
        new Date().toISOString()
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function listExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, merchant, amount, currency, date, category, note, created_at,
            receipt_uri, receipt_name, receipt_mime_type
     FROM expenses
     ORDER BY date DESC, created_at DESC`
  );

  const tagsByExpenseId = await loadTagsByExpenseId(
    db,
    rows.map((row) => row.id)
  );

  return rows.map((row) => mapRowToExpense(row, tagsByExpenseId.get(row.id) ?? []));
}

export async function getRecentExpenses(
  db: SQLiteDatabase,
  limit = 3
): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, merchant, amount, currency, date, category, note, created_at,
            receipt_uri, receipt_name, receipt_mime_type
     FROM expenses
     ORDER BY date DESC, created_at DESC
     LIMIT ?`,
    limit
  );

  const tagsByExpenseId = await loadTagsByExpenseId(
    db,
    rows.map((row) => row.id)
  );

  return rows.map((row) => mapRowToExpense(row, tagsByExpenseId.get(row.id) ?? []));
}

export async function getExpenseById(
  db: SQLiteDatabase,
  id: string
): Promise<Expense | null> {
  const row = await db.getFirstAsync<ExpenseRow>(
    `SELECT id, merchant, amount, currency, date, category, note, created_at,
            receipt_uri, receipt_name, receipt_mime_type
     FROM expenses
     WHERE id = ?`,
    id
  );

  if (!row) {
    return null;
  }

  const tagsByExpenseId = await loadTagsByExpenseId(db, [id]);

  return mapRowToExpense(row, tagsByExpenseId.get(id) ?? []);
}

export async function getExpenseStats(
  db: SQLiteDatabase
): Promise<{ count: number; total: number }> {
  const row = await db.getFirstAsync<{ count: number; total: number | null }>(
    `SELECT COUNT(*) as count, SUM(amount) as total
     FROM expenses`
  );

  return {
    count: row?.count ?? 0,
    total: row?.total ?? 0,
  };
}

export async function createExpense(
  db: SQLiteDatabase,
  input: CreateExpenseInput
): Promise<string> {
  const id = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const note = input.note?.trim() ? input.note.trim() : null;
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO expenses
      (id, merchant, amount, currency, date, category, note, created_at,
       receipt_uri, receipt_name, receipt_mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.merchant.trim(),
    input.amount,
    input.currency,
    input.date,
    input.category,
    note,
    createdAt,
    input.receiptUri ?? null,
    input.receiptName ?? null,
    input.receiptMimeType ?? null
  );

  await syncExpenseTags(db, id, input.tagIds ?? []);

  return id;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: string,
  input: CreateExpenseInput
): Promise<void> {
  const note = input.note?.trim() ? input.note.trim() : null;

  await db.runAsync(
    `UPDATE expenses
     SET merchant = ?,
         amount = ?,
         currency = ?,
         date = ?,
         category = ?,
         note = ?,
         receipt_uri = ?,
         receipt_name = ?,
         receipt_mime_type = ?
     WHERE id = ?`,
    input.merchant.trim(),
    input.amount,
    input.currency,
    input.date,
    input.category,
    note,
    input.receiptUri ?? null,
    input.receiptName ?? null,
    input.receiptMimeType ?? null,
    id
  );

  await syncExpenseTags(db, id, input.tagIds ?? []);
}

export async function deleteExpense(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.execAsync('BEGIN');

  try {
    await db.runAsync(`DELETE FROM expense_tags WHERE expense_id = ?`, id);
    await db.runAsync(`DELETE FROM expenses WHERE id = ?`, id);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}