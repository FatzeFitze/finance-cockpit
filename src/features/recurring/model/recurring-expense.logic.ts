import type { RecurringExpense } from './recurring-expense.types';

function parseStoredDate(dateString: string): Date {
  const [yearString, monthString, dayString] = dateString.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  return new Date(year, month - 1, day);
}

export function formatStoredDateForDisplay(dateString: string): string {
  return parseStoredDate(dateString).toLocaleDateString();
}

export function getCurrentMonthKey(baseDate: Date = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export function getTodayKey(baseDate: Date = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getRecurringExpenseDateForCurrentMonth(
  recurringExpense: RecurringExpense,
  baseDate: Date = new Date()
): string {
  const monthKey = getCurrentMonthKey(baseDate);
  const day = String(recurringExpense.dayOfMonth).padStart(2, '0');

  return `${monthKey}-${day}`;
}

export function canGenerateRecurringExpenseThisMonth(
  recurringExpense: RecurringExpense,
  baseDate: Date = new Date()
): boolean {
  return (
    recurringExpense.isActive &&
    recurringExpense.lastGeneratedMonth !== getCurrentMonthKey(baseDate)
  );
}

export function isRecurringExpenseDue(
  recurringExpense: RecurringExpense,
  baseDate: Date = new Date()
): boolean {
  if (!canGenerateRecurringExpenseThisMonth(recurringExpense, baseDate)) {
    return false;
  }

  return (
    getTodayKey(baseDate) >=
    getRecurringExpenseDateForCurrentMonth(recurringExpense, baseDate)
  );
}

export function getRecurringExpenseStatusLabel(
  recurringExpense: RecurringExpense,
  baseDate: Date = new Date()
): string {
  if (!recurringExpense.isActive) {
    return 'Paused';
  }

  if (recurringExpense.lastGeneratedMonth === getCurrentMonthKey(baseDate)) {
    return 'Created for current month';
  }

  const dueDate = getRecurringExpenseDateForCurrentMonth(recurringExpense, baseDate);
  const formattedDueDate = formatStoredDateForDisplay(dueDate);

  if (isRecurringExpenseDue(recurringExpense, baseDate)) {
    return `Due since ${formattedDueDate}`;
  }

  return `Scheduled for ${formattedDueDate}`;
}