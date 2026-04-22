import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../../expenses/components/ExpenseList';
import {
    getExpenseCount,
    getExpenseTotal,
    getRecentExpenses,
} from '../../expenses/data/expenses.repository';

export default function HomeScreen() {
  const expenseCount = getExpenseCount();
  const total = getExpenseTotal();
  const recentExpenses = getRecentExpenses(3);

  const formattedTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(total);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Finance Cockpit</ThemedText>
      <ThemedText>PoC dashboard with mock data for now.</ThemedText>

      <View style={styles.summaryCard}>
        <ThemedText type="defaultSemiBold">Expense count: {expenseCount}</ThemedText>
        <ThemedText type="defaultSemiBold">Total tracked: {formattedTotal}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Recent expenses</ThemedText>
        <ExpenseList expenses={recentExpenses} emptyMessage="No recent expenses." />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
  section: {
    gap: 12,
  },
});