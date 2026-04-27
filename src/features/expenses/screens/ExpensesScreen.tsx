import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseList } from '../components/ExpenseList';
import { listExpenses } from '../data/expenses.repository';
import {
  applyExpenseFilters,
  DEFAULT_EXPENSE_FILTERS,
  RECEIPT_FILTER_OPTIONS,
  SORT_OPTIONS,
  type ExpenseCategoryFilter,
  type ExpenseFilterState,
} from '../model/expense.filters';
import { EXPENSE_CATEGORIES, type Expense } from '../model/expense.types';

const CATEGORY_OPTIONS: ExpenseCategoryFilter[] = ['All', ...EXPENSE_CATEGORIES];

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<ExpenseFilterState>(DEFAULT_EXPENSE_FILTERS);
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

  const visibleExpenses = useMemo(
    () => applyExpenseFilters(expenses, filters),
    [expenses, filters]
  );

  const visibleTotal = useMemo(
    () => visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [visibleExpenses]
  );

  function handleExpensePress(expense: Expense) {
    router.push({
      pathname: '/expenses/[id]',
      params: { id: expense.id },
    });
  }

  function updateFilters(patch: Partial<ExpenseFilterState>) {
    setFilters((current) => ({
      ...current,
      ...patch,
    }));
  }

  const formattedVisibleTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(visibleTotal);

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Expenses</ThemedText>
          <ThemedText>Browse, filter, and sort your saved expenses.</ThemedText>

          <View style={styles.summaryCard}>
            <ThemedText type="defaultSemiBold">
              Matching expenses: {visibleExpenses.length}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              Matching total: {formattedVisibleTotal}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Category</ThemedText>
            <View style={styles.chips}>
              {CATEGORY_OPTIONS.map((item) => {
                const isSelected = item === filters.category;

                return (
                  <Pressable
                    key={item}
                    onPress={() => updateFilters({ category: item })}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <ThemedText>{item}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Receipt</ThemedText>
            <View style={styles.chips}>
              {RECEIPT_FILTER_OPTIONS.map((option) => {
                const isSelected = option.value === filters.receipt;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => updateFilters({ receipt: option.value })}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <ThemedText>{option.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Sort</ThemedText>
            <View style={styles.chips}>
              {SORT_OPTIONS.map((option) => {
                const isSelected = option.value === filters.sort;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => updateFilters({ sort: option.value })}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <ThemedText>{option.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Results</ThemedText>
            <ExpenseList
              expenses={visibleExpenses}
              emptyMessage="No expenses match the current filters."
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#e7f0ff',
  },
});