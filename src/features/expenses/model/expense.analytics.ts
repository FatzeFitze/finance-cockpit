import type { Expense, ExpenseCategory } from './expense.types';

export type CategoryBreakdownItem = {
  category: ExpenseCategory;
  count: number;
  total: number;
};

export type MerchantBreakdownItem = {
  merchant: string;
  count: number;
  total: number;
};

export type ExpenseDashboard = {
  allTimeCount: number;
  allTimeTotal: number;
  currentMonthCount: number;
  currentMonthTotal: number;
  currentMonthLabel: string;
  recentExpenses: Expense[];
  categoryBreakdown: CategoryBreakdownItem[];
  topMerchants: MerchantBreakdownItem[];
};

function getCurrentMonthKey(baseDate: Date = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function buildMonthLabel(monthKey: string): string {
  const [yearString, monthString] = monthKey.split('-');
  const year = Number(yearString);
  const month = Number(monthString);

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function buildExpenseDashboard(expenses: Expense[]): ExpenseDashboard {
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthExpenses = expenses.filter((expense) =>
    expense.date.startsWith(currentMonthKey)
  );

  const categoryMap = new Map<ExpenseCategory, CategoryBreakdownItem>();
  for (const expense of currentMonthExpenses) {
    const existing = categoryMap.get(expense.category) ?? {
      category: expense.category,
      count: 0,
      total: 0,
    };

    existing.count += 1;
    existing.total += expense.amount;

    categoryMap.set(expense.category, existing);
  }

  const merchantMap = new Map<string, MerchantBreakdownItem>();
  for (const expense of currentMonthExpenses) {
    const existing = merchantMap.get(expense.merchant) ?? {
      merchant: expense.merchant,
      count: 0,
      total: 0,
    };

    existing.count += 1;
    existing.total += expense.amount;

    merchantMap.set(expense.merchant, existing);
  }

  return {
    allTimeCount: expenses.length,
    allTimeTotal: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    currentMonthCount: currentMonthExpenses.length,
    currentMonthTotal: currentMonthExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    ),
    currentMonthLabel: buildMonthLabel(currentMonthKey),
    recentExpenses: expenses.slice(0, 5),
    categoryBreakdown: Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total
    ),
    topMerchants: Array.from(merchantMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  };
}