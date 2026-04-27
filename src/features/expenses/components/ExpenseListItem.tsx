import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Expense } from '../model/expense.types';

type ExpenseListItemProps = {
  expense: Expense;
  onPress?: () => void;
};

export function ExpenseListItem({ expense, onPress }: ExpenseListItemProps) {
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: expense.currency,
  }).format(expense.amount);

  const formattedDate = new Date(expense.date).toLocaleDateString();
  const tagLabel = expense.tags.map((tag) => tag.name).join(', ');

  const content = (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">{expense.merchant}</ThemedText>
        <ThemedText type="defaultSemiBold">{formattedAmount}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText>{expense.category}</ThemedText>
        <ThemedText>{formattedDate}</ThemedText>
      </View>

      {expense.tags.length > 0 ? (
        <ThemedText style={styles.secondaryText}>Tags: {tagLabel}</ThemedText>
      ) : null}

      {expense.note ? <ThemedText style={styles.secondaryText}>{expense.note}</ThemedText> : null}

      {expense.receiptName ? (
        <ThemedText style={styles.secondaryText}>Receipt: {expense.receiptName}</ThemedText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
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
  secondaryText: {
    opacity: 0.75,
  },
});