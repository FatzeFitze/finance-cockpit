import type { Expense, ExpenseCategory } from './expense.types';

export type CategoryBreakdownItem = {
  category: ExpenseCategory;
  count: number;
  total: number;
  percentage: number;
};

export type MerchantBreakdownItem = {
  merchant: string;
  count: number;
  total: number;
};

export type TagBreakdownItem = {
  tagId: string;
  tagName: string;
  count: number;
  total: number;
};

export type MonthlySpendingPoint = {
  monthKey: string;
  label: string;
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
  tagBreakdown: TagBreakdownItem[];
  monthlyTrend: MonthlySpendingPoint[];
};

function getCurrentMonthKey(baseDate: Date = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function buildMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

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

function buildShortMonthLabel(monthKey: string): string {
  const [yearString, monthString] = monthKey.split('-');
  const year = Number(yearString);
  const month = Number(monthString);

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
  });
}

function buildRecentMonthKeys(monthCount: number, baseDate: Date = new Date()): string[] {
  const result: string[] = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
    result.push(buildMonthKey(date));
  }

  return result;
}

function getExpenseMonthKey(expense: Expense): string {
  return expense.date.slice(0, 7);
}

export function buildExpenseDashboard(expenses: Expense[]): ExpenseDashboard {
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthExpenses = expenses.filter((expense) =>
    expense.date.startsWith(currentMonthKey)
  );

  const currentMonthTotal = currentMonthExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const categoryMap = new Map<ExpenseCategory, CategoryBreakdownItem>();
  for (const expense of currentMonthExpenses) {
    const existing = categoryMap.get(expense.category) ?? {
      category: expense.category,
      count: 0,
      total: 0,
      percentage: 0,
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

  const tagMap = new Map<string, TagBreakdownItem>();
  for (const expense of currentMonthExpenses) {
    for (const tag of expense.tags) {
      const existing = tagMap.get(tag.id) ?? {
        tagId: tag.id,
        tagName: tag.name,
        count: 0,
        total: 0,
      };

      existing.count += 1;
      existing.total += expense.amount;

      tagMap.set(tag.id, existing);
    }
  }

  const monthKeys = buildRecentMonthKeys(6);
  const monthlyTrendMap = new Map<string, MonthlySpendingPoint>();

  for (const monthKey of monthKeys) {
    monthlyTrendMap.set(monthKey, {
      monthKey,
      label: buildShortMonthLabel(monthKey),
      count: 0,
      total: 0,
    });
  }

  for (const expense of expenses) {
    const monthKey = getExpenseMonthKey(expense);
    const existing = monthlyTrendMap.get(monthKey);

    if (!existing) {
      continue;
    }

    existing.count += 1;
    existing.total += expense.amount;
  }

  return {
    allTimeCount: expenses.length,
    allTimeTotal: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    currentMonthCount: currentMonthExpenses.length,
    currentMonthTotal,
    currentMonthLabel: buildMonthLabel(currentMonthKey),
    recentExpenses: expenses.slice(0, 5),
    categoryBreakdown: Array.from(categoryMap.values())
      .map((item) => ({
        ...item,
        percentage: currentMonthTotal > 0 ? (item.total / currentMonthTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total),
    topMerchants: Array.from(merchantMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    tagBreakdown: Array.from(tagMap.values()).sort((a, b) => b.total - a.total),
    monthlyTrend: monthKeys.map((monthKey) => monthlyTrendMap.get(monthKey)!),
  };
}