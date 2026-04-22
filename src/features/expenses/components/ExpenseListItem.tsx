import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Expense } from '../model/expense.types';

type ExpenseListItemProps = {
  expense: Expense;
};

export function ExpenseListItem({ expense }: ExpenseListItemProps) {
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: expense.currency,
  }).format(expense.amount);

  const formattedDate = new Date(expense.date).toLocaleDateString();

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">{expense.merchant}</ThemedText>
        <ThemedText type="defaultSemiBold">{formattedAmount}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText>{expense.category}</ThemedText>
        <ThemedText>{formattedDate}</ThemedText>
      </View>

      {expense.note ? <ThemedText style={styles.note}>{expense.note}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  note: {
    opacity: 0.75,
  },
});