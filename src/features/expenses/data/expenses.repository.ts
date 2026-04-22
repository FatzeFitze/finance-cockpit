import type { Expense } from '../../expenses/model/expense.types';
import { mockExpenses } from './mock-expenses';

export function listExpenses(): Expense[] {
  return [...mockExpenses].sort((a, b) => b.date.localeCompare(a.date));
}

export function getRecentExpenses(limit = 3): Expense[] {
  return listExpenses().slice(0, limit);
}

export function getExpenseCount(): number {
  return mockExpenses.length;
}

export function getExpenseTotal(): number {
  return mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
}