import type { Expense, ExpenseCategory } from './expense.types';

export type ExpenseCategoryFilter = ExpenseCategory | 'All';
export type ReceiptFilter = 'all' | 'with_receipt' | 'without_receipt';
export type ExpenseSortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export type ExpenseFilterState = {
  category: ExpenseCategoryFilter;
  receipt: ReceiptFilter;
  sort: ExpenseSortOption;
};

export const DEFAULT_EXPENSE_FILTERS: ExpenseFilterState = {
  category: 'All',
  receipt: 'all',
  sort: 'date_desc',
};

export const RECEIPT_FILTER_OPTIONS: Array<{
  value: ReceiptFilter;
  label: string;
}> = [
  { value: 'all', label: 'All receipts' },
  { value: 'with_receipt', label: 'With receipt' },
  { value: 'without_receipt', label: 'Without receipt' },
];

export const SORT_OPTIONS: Array<{
  value: ExpenseSortOption;
  label: string;
}> = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

function compareByDateDesc(a: Expense, b: Expense): number {
  const dateComparison = b.date.localeCompare(a.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function compareByDateAsc(a: Expense, b: Expense): number {
  const dateComparison = a.date.localeCompare(b.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return a.createdAt.localeCompare(b.createdAt);
}

export function applyExpenseFilters(
  expenses: Expense[],
  filters: ExpenseFilterState
): Expense[] {
  const filtered = expenses.filter((expense) => {
    const matchesCategory =
      filters.category === 'All' || expense.category === filters.category;

    const hasReceipt = !!expense.receiptUri;

    const matchesReceipt =
      filters.receipt === 'all' ||
      (filters.receipt === 'with_receipt' && hasReceipt) ||
      (filters.receipt === 'without_receipt' && !hasReceipt);

    return matchesCategory && matchesReceipt;
  });

  const sorted = [...filtered];

  switch (filters.sort) {
    case 'date_desc':
      sorted.sort(compareByDateDesc);
      break;
    case 'date_asc':
      sorted.sort(compareByDateAsc);
      break;
    case 'amount_desc':
      sorted.sort((a, b) => {
        const amountComparison = b.amount - a.amount;
        return amountComparison !== 0 ? amountComparison : compareByDateDesc(a, b);
      });
      break;
    case 'amount_asc':
      sorted.sort((a, b) => {
        const amountComparison = a.amount - b.amount;
        return amountComparison !== 0 ? amountComparison : compareByDateAsc(a, b);
      });
      break;
  }

  return sorted;
}