import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../../expenses/components/ExpenseList';
import { listExpenses } from '../../expenses/data/expenses.repository';
import { buildExpenseDashboard } from '../../expenses/model/expense.analytics';
import type { Expense } from '../../expenses/model/expense.types';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
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

      loadData();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  const dashboard = useMemo(() => buildExpenseDashboard(expenses), [expenses]);

  function handleExpensePress(expense: Expense) {
    router.push({
      pathname: '/expenses/[id]',
      params: { id: expense.id },
    });
  }

  function handleOpenExpenses() {
    router.navigate('/expenses');
  }

  const formattedAllTimeTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(dashboard.allTimeTotal);

  const formattedCurrentMonthTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(dashboard.currentMonthTotal);

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Finance Cockpit</ThemedText>
          <ThemedText>
            A simple personal finance dashboard based on your locally stored expenses.
          </ThemedText>

          <View style={styles.card}>
            <ThemedText type="subtitle">All time</ThemedText>
            <ThemedText type="defaultSemiBold">
              Tracked expenses: {dashboard.allTimeCount}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              Total tracked: {formattedAllTimeTotal}
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText type="subtitle">{dashboard.currentMonthLabel}</ThemedText>
            <ThemedText type="defaultSemiBold">
              This month: {formattedCurrentMonthTotal}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              Expense count: {dashboard.currentMonthCount}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Current month by category</ThemedText>
              <Pressable onPress={handleOpenExpenses} style={styles.linkButton}>
                <ThemedText type="defaultSemiBold">Open expenses</ThemedText>
              </Pressable>
            </View>

            {dashboard.categoryBreakdown.length === 0 ? (
              <ThemedText>No expenses recorded for this month yet.</ThemedText>
            ) : (
              <View style={styles.list}>
                {dashboard.categoryBreakdown.map((item) => {
                  const formattedTotal = new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.total);

                  return (
                    <View key={item.category} style={styles.rowCard}>
                      <ThemedText type="defaultSemiBold">{item.category}</ThemedText>
                      <ThemedText>
                        {item.count} items · {formattedTotal}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Top merchants this month</ThemedText>

            {dashboard.topMerchants.length === 0 ? (
              <ThemedText>No merchant summary available yet.</ThemedText>
            ) : (
              <View style={styles.list}>
                {dashboard.topMerchants.map((item) => {
                  const formattedTotal = new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.total);

                  return (
                    <View key={item.merchant} style={styles.rowCard}>
                      <ThemedText type="defaultSemiBold">{item.merchant}</ThemedText>
                      <ThemedText>
                        {item.count} items · {formattedTotal}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Recent expenses</ThemedText>
            <ExpenseList
              expenses={dashboard.recentExpenses}
              emptyMessage="No recent expenses."
              onExpensePress={handleExpensePress}
            />
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 12,
  },
  linkButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  list: {
    gap: 10,
  },
  rowCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 6,
  },
});