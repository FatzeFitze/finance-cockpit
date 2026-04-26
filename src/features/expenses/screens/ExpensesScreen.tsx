import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../components/ExpenseList';
import { listExpenses } from '../data/expenses.repository';
import type { Expense } from '../model/expense.types';

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadExpenses() {
        setIsLoading(true);

        try {
          const result = await listExpenses(db);
          if (isActive) {
            setExpenses(result);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadExpenses();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  function handleExpensePress(expense: Expense) {
    router.push({
      pathname: '/expenses/[id]',
      params: { id: expense.id },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Expenses</ThemedText>
      <ThemedText>All currently tracked expenses.</ThemedText>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <ExpenseList
          expenses={expenses}
          emptyMessage="No expenses yet."
          onExpensePress={handleExpensePress}
        />
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
});