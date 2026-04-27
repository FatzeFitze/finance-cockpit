import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createTag, listTags } from '../../tags/data/tags.repository';
import type { Tag } from '../../tags/model/tag.types';
import { ExpenseForm } from '../components/ExpenseForm';
import { createExpense } from '../data/expenses.repository';
import type { CreateExpenseInput } from '../model/expense.types';

export default function AddExpenseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const loadTags = useCallback(async () => {
    const result = await listTags(db);
    setAvailableTags(result);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadTags();
    }, [loadTags])
  );

  async function handleCreateTag(tagName: string): Promise<Tag> {
    try {
      setIsCreatingTag(true);
      const tag = await createTag(db, tagName);
      await loadTags();
      return tag;
    } finally {
      setIsCreatingTag(false);
    }
  }

  async function handleSubmit(input: CreateExpenseInput) {
    try {
      setIsSaving(true);
      await createExpense(db, input);

      Alert.alert('Saved', 'Expense saved locally.');
      router.navigate('/expenses');
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'Could not save the expense.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Add Expense</ThemedText>
        <ThemedText>Manual entry for the PoC.</ThemedText>

        <ExpenseForm
          availableTags={availableTags}
          submitLabel="Save expense"
          isSubmitting={isSaving}
          isCreatingTag={isCreatingTag}
          onCreateTag={handleCreateTag}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
});