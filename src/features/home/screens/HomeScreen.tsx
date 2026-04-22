import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../../expenses/components/ExpenseList';
import { getExpenseStats, getRecentExpenses } from '../../expenses/data/expenses.repository';
import type { Expense } from '../../expenses/model/expense.types';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [expenseCount, setExpenseCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
        setIsLoading(true);

        try {
          const [stats, recent] = await Promise.all([
            getExpenseStats(db),
            getRecentExpenses(db, 3),
          ]);

          if (isActive) {
            setExpenseCount(stats.count);
            setTotal(stats.total);
            setRecentExpenses(recent);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadData();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  const formattedTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(total);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Finance Cockpit</ThemedText>
      <ThemedText>PoC dashboard with local SQLite storage.</ThemedText>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <ThemedText type="defaultSemiBold">Expense count: {expenseCount}</ThemedText>
            <ThemedText type="defaultSemiBold">Total tracked: {formattedTotal}</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Recent expenses</ThemedText>
            <ExpenseList expenses={recentExpenses} emptyMessage="No recent expenses." />
          </View>
        </>
      )}
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