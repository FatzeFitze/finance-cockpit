import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpenseForm } from '../components/ExpenseForm';
import { getExpenseById, updateExpense } from '../data/expenses.repository';
import type { CreateExpenseInput, Expense, ExpenseAttachment } from '../model/expense.types';

function buildInitialReceipt(expense: Expense): ExpenseAttachment | null {
  if (!expense.receiptUri || !expense.receiptName) {
    return null;
  }

  return {
    uri: expense.receiptUri,
    name: expense.receiptName,
    mimeType: expense.receiptMimeType ?? null,
  };
}

export default function EditExpenseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const expenseId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadExpense() {
      if (!expenseId) {
        setExpense(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const result = await getExpenseById(db, expenseId);

        if (isActive) {
          setExpense(result);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadExpense();

    return () => {
      isActive = false;
    };
  }, [db, expenseId]);

  async function handleSubmit(input: CreateExpenseInput) {
    if (!expenseId) {
      return;
    }

    try {
      setIsSaving(true);
      await updateExpense(db, expenseId, input);

      Alert.alert('Saved', 'Expense updated.');
      router.replace({
        pathname: '/expenses/[id]',
        params: { id: expenseId },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Update failed', 'Could not update the expense.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: expense ? `Edit ${expense.merchant}` : 'Edit expense' }} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !expense ? (
        <View style={styles.centered}>
          <ThemedText type="title">Expense not found</ThemedText>
          <ThemedText>The requested expense could not be loaded.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Edit Expense</ThemedText>
          <ThemedText>Update the saved values below.</ThemedText>

          <ExpenseForm
            key={expense.id}
            submitLabel="Save changes"
            isSubmitting={isSaving}
            onSubmit={handleSubmit}
            initialValues={{
              merchant: expense.merchant,
              amount: String(expense.amount),
              note: expense.note ?? '',
              category: expense.category,
              date: expense.date,
              receipt: buildInitialReceipt(expense),
            }}
          />
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
});