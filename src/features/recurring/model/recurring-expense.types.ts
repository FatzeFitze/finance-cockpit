import type { ExpenseCategory, ExpenseCurrency } from '../../expenses/model/expense.types';

export type RecurringExpenseFrequency = 'monthly';

export type RecurringExpense = {
  id: string;
  merchant: string;
  amount: number;
  currency: ExpenseCurrency;
  category: ExpenseCategory;
  note?: string | null;
  frequency: RecurringExpenseFrequency;
  dayOfMonth: number;
  isActive: boolean;
  lastGeneratedMonth?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecurringExpenseInput = {
  merchant: string;
  amount: number;
  currency: ExpenseCurrency;
  category: ExpenseCategory;
  note?: string;
  dayOfMonth: number;
};