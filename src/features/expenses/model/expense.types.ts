export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Housing'
  | 'Health'
  | 'Entertainment'
  | 'Other';

export type Expense = {
  id: string;
  merchant: string;
  amount: number;
  currency: 'EUR' | 'USD';
  date: string;
  category: ExpenseCategory;
  note?: string;
  createdAt: string;
};