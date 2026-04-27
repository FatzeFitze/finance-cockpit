import type { SQLiteDatabase } from 'expo-sqlite';

import type { CreateExpenseInput } from '../../expenses/model/expense.types';
import {
    getCurrentMonthKey,
    getRecurringExpenseDateForCurrentMonth,
} from '../model/recurring-expense.logic';
import type {
    CreateRecurringExpenseInput,
    RecurringExpense,
} from '../model/recurring-expense.types';

type RecurringExpenseRow = {
  id: string;
  merchant: string;
  amount: number;
  currency: 'EUR' | 'USD';
  category: string;
  note: string | null;
  frequency: 'monthly';
  day_of_month: number;
  is_active: number;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    merchant: row.merchant,
    amount: row.amount,
    currency: row.currency,
    category: row.category as RecurringExpense['category'],
    note: row.note,
    frequency: row.frequency,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active === 1,
    lastGeneratedMonth: row.last_generated_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getRecurringExpenseById(
  db: SQLiteDatabase,
  id: string
): Promise<RecurringExpense | null> {
  const row = await db.getFirstAsync<RecurringExpenseRow>(
    `SELECT id, merchant, amount, currency, category, note, frequency,
            day_of_month, is_active, last_generated_month, created_at, updated_at
     FROM recurring_expenses
     WHERE id = ?`,
    id
  );

  return row ? mapRowToRecurringExpense(row) : null;
}

export async function listRecurringExpenses(
  db: SQLiteDatabase
): Promise<RecurringExpense[]> {
  const rows = await db.getAllAsync<RecurringExpenseRow>(
    `SELECT id, merchant, amount, currency, category, note, frequency,
            day_of_month, is_active, last_generated_month, created_at, updated_at
     FROM recurring_expenses
     ORDER BY is_active DESC, day_of_month ASC, merchant ASC`
  );

  return rows.map(mapRowToRecurringExpense);
}

export async function createRecurringExpense(
  db: SQLiteDatabase,
  input: CreateRecurringExpenseInput
): Promise<string> {
  const id = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();
  const note = input.note?.trim() ? input.note.trim() : null;

  await db.runAsync(
    `INSERT INTO recurring_expenses
      (id, merchant, amount, currency, category, note, frequency,
       day_of_month, is_active, last_generated_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.merchant.trim(),
    input.amount,
    input.currency,
    input.category,
    note,
    'monthly',
    input.dayOfMonth,
    1,
    null,
    now,
    now
  );

  return id;
}

export async function setRecurringExpenseActive(
  db: SQLiteDatabase,
  id: string,
  isActive: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE recurring_expenses
     SET is_active = ?, updated_at = ?
     WHERE id = ?`,
    isActive ? 1 : 0,
    now,
    id
  );
}

export async function deleteRecurringExpense(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM recurring_expenses WHERE id = ?`, id);
}

export async function generateExpenseFromRecurring(
  db: SQLiteDatabase,
  recurringExpenseId: string,
  baseDate: Date = new Date()
): Promise<string> {
  const recurringExpense = await getRecurringExpenseById(db, recurringExpenseId);

  if (!recurringExpense) {
    throw new Error('Recurring expense not found.');
  }

  if (!recurringExpense.isActive) {
    throw new Error('Recurring expense is paused.');
  }

  const currentMonthKey = getCurrentMonthKey(baseDate);

  if (recurringExpense.lastGeneratedMonth === currentMonthKey) {
    throw new Error('Recurring expense already created for this month.');
  }

  const expenseInput: CreateExpenseInput = {
    merchant: recurringExpense.merchant,
    amount: recurringExpense.amount,
    currency: recurringExpense.currency,
    date: getRecurringExpenseDateForCurrentMonth(recurringExpense, baseDate),
    category: recurringExpense.category,
    note: recurringExpense.note ?? undefined,
    receiptUri: undefined,
    receiptName: undefined,
    receiptMimeType: null,
  };

  const expenseId = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const createdAt = new Date().toISOString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO expenses
      (id, merchant, amount, currency, date, category, note, created_at,
       receipt_uri, receipt_name, receipt_mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    expenseId,
    expenseInput.merchant.trim(),
    expenseInput.amount,
    expenseInput.currency,
    expenseInput.date,
    expenseInput.category,
    expenseInput.note?.trim() ? expenseInput.note.trim() : null,
    createdAt,
    null,
    null,
    null
  );

  await db.runAsync(
    `UPDATE recurring_expenses
     SET last_generated_month = ?, updated_at = ?
     WHERE id = ?`,
    currentMonthKey,
    now,
    recurringExpenseId
  );

  return expenseId;
}