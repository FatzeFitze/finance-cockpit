import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecurringExpenseForm } from '../components/RecurringExpenseForm';
import { RecurringExpenseListItem } from '../components/RecurringExpenseListItem';
import {
    createRecurringExpense,
    deleteRecurringExpense,
    generateExpenseFromRecurring,
    listRecurringExpenses,
    setRecurringExpenseActive,
} from '../data/recurring-expenses.repository';
import { isRecurringExpenseDue } from '../model/recurring-expense.logic';
import type {
    CreateRecurringExpenseInput,
    RecurringExpense,
} from '../model/recurring-expense.types';

export default function RecurringExpensesScreen() {
  const db = useSQLiteContext();

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRecurringExpenses = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await listRecurringExpenses(db);
      setRecurringExpenses(result);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadRecurringExpenses();
    }, [loadRecurringExpenses])
  );

  const dueCount = useMemo(
    () => recurringExpenses.filter((item) => isRecurringExpenseDue(item)).length,
    [recurringExpenses]
  );

  async function handleCreateRecurringExpense(input: CreateRecurringExpenseInput) {
    try {
      setIsSaving(true);
      await createRecurringExpense(db, input);
      Alert.alert('Saved', 'Recurring expense template created.');
      await loadRecurringExpenses();
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'Could not create the recurring expense.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate(recurringExpense: RecurringExpense) {
    try {
      setGeneratingId(recurringExpense.id);
      await generateExpenseFromRecurring(db, recurringExpense.id);
      Alert.alert('Created', 'This month’s expense was created.');
      await loadRecurringExpenses();
    } catch (error) {
      console.error(error);
      Alert.alert('Create failed', 'Could not create the recurring expense.');
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleToggleActive(recurringExpense: RecurringExpense) {
    try {
      setTogglingId(recurringExpense.id);
      await setRecurringExpenseActive(db, recurringExpense.id, !recurringExpense.isActive);
      await loadRecurringExpenses();
    } catch (error) {
      console.error(error);
      Alert.alert('Update failed', 'Could not update the recurring expense.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(recurringExpense: RecurringExpense) {
    try {
      setDeletingId(recurringExpense.id);
      await deleteRecurringExpense(db, recurringExpense.id);
      await loadRecurringExpenses();
    } catch (error) {
      console.error(error);
      Alert.alert('Delete failed', 'Could not delete the recurring expense.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Recurring</ThemedText>
          <ThemedText>
            Create monthly templates for rent, insurance, subscriptions, and other
            predictable expenses.
          </ThemedText>

          <View style={styles.summaryCard}>
            <ThemedText type="defaultSemiBold">
              Active templates: {recurringExpenses.filter((item) => item.isActive).length}
            </ThemedText>
            <ThemedText type="defaultSemiBold">Due now: {dueCount}</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Create recurring template</ThemedText>
            <RecurringExpenseForm
              onSubmit={handleCreateRecurringExpense}
              isSubmitting={isSaving}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Saved recurring expenses</ThemedText>

            {recurringExpenses.length === 0 ? (
              <ThemedText>No recurring expenses created yet.</ThemedText>
            ) : (
              <View style={styles.list}>
                {recurringExpenses.map((item) => (
                  <RecurringExpenseListItem
                    key={item.id}
                    recurringExpense={item}
                    onGenerate={() => handleGenerate(item)}
                    onToggleActive={() => handleToggleActive(item)}
                    onDelete={() => handleDelete(item)}
                    isGenerating={generatingId === item.id}
                    isToggling={togglingId === item.id}
                    isDeleting={deletingId === item.id}
                  />
                ))}
              </View>
            )}
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
  list: {
    gap: 12,
  },
});