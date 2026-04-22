import type { Expense } from '../../expenses/model/expense.types';

export const mockExpenses: Expense[] = [
  {
    id: '1',
    merchant: 'Lidl',
    amount: 42.35,
    currency: 'EUR',
    date: '2026-04-18',
    category: 'Food',
    note: 'Weekly groceries',
    createdAt: '2026-04-18T18:30:00Z',
  },
  {
    id: '2',
    merchant: 'Deutsche Bahn',
    amount: 19.9,
    currency: 'EUR',
    date: '2026-04-17',
    category: 'Transport',
    note: 'Train ticket',
    createdAt: '2026-04-17T07:45:00Z',
  },
  {
    id: '3',
    merchant: 'Amazon',
    amount: 15.49,
    currency: 'EUR',
    date: '2026-04-16',
    category: 'Other',
    note: 'Phone cable',
    createdAt: '2026-04-16T20:10:00Z',
  },
];