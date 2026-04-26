import type { SQLiteDatabase } from 'expo-sqlite';

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

function mapRowToExpense(row: ExpenseRow): Expense {
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
  };
}

export async function listExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, merchant, amount, currency, date, category, note, created_at,
            receipt_uri, receipt_name, receipt_mime_type
     FROM expenses
     ORDER BY date DESC, created_at DESC`
  );

  return rows.map(mapRowToExpense);
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

  return rows.map(mapRowToExpense);
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

  return row ? mapRowToExpense(row) : null;
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
}

export async function deleteExpense(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, id);
}