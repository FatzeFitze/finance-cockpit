export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Health',
  'Entertainment',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseCurrency = 'EUR' | 'USD';

export type ExpenseAttachment = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export type Expense = {
  id: string;
  merchant: string;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  category: ExpenseCategory;
  note?: string | null;
  createdAt: string;
  receiptUri?: string | null;
  receiptName?: string | null;
  receiptMimeType?: string | null;
};

export type CreateExpenseInput = {
  merchant: string;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  category: ExpenseCategory;
  note?: string;
  receiptUri?: string;
  receiptName?: string;
  receiptMimeType?: string | null;
};