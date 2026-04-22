import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../components/ExpenseList';
import { listExpenses } from '../data/expenses.repository';

export default function ExpensesScreen() {
  const expenses = listExpenses();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Expenses</ThemedText>
      <ThemedText>All currently tracked expenses.</ThemedText>

      <ExpenseList expenses={expenses} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
});