import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Expense } from '../model/expense.types';
import { ExpenseListItem } from './ExpenseListItem';

type ExpenseListProps = {
  expenses: Expense[];
  emptyMessage?: string;
  onExpensePress?: (expense: Expense) => void;
};

export function ExpenseList({
  expenses,
  emptyMessage = 'No expenses yet.',
  onExpensePress,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return <ThemedText>{emptyMessage}</ThemedText>;
  }

  return (
    <View style={styles.list}>
      {expenses.map((expense) => (
        <ExpenseListItem
          key={expense.id}
          expense={expense}
          onPress={onExpensePress ? () => onExpensePress(expense) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});