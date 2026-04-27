import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteExpense, getExpenseById } from '../data/expenses.repository';
import type { Expense } from '../model/expense.types';

export default function ExpenseDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const expenseId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

    void loadExpense();

    return () => {
      isActive = false;
    };
  }, [db, expenseId]);

  async function handleShareReceipt() {
    if (!expense?.receiptUri) {
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert('Sharing unavailable', 'This device cannot share receipt files here.');
        return;
      }

      await Sharing.shareAsync(expense.receiptUri);
    } catch (error) {
      console.error(error);
      Alert.alert('Share failed', 'Could not share the receipt file.');
    }
  }

  function handleEdit() {
    if (!expense) {
      return;
    }

    router.push({
      pathname: '/expenses/[id]/edit',
      params: { id: expense.id },
    });
  }

  function handleDelete() {
    if (!expense) {
      return;
    }

    Alert.alert(
      'Delete expense?',
      `Delete "${expense.merchant}" permanently? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteExpense(db, expense.id);
              router.replace('/expenses');
            } catch (error) {
              console.error(error);
              Alert.alert('Delete failed', 'Could not delete the expense.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }

  const formattedAmount = expense
    ? new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: expense.currency,
      }).format(expense.amount)
    : '';

  const formattedDate = expense ? new Date(expense.date).toLocaleDateString() : '';
  const isImageReceipt = !!expense?.receiptMimeType?.startsWith('image/');
  const tagLabel = expense?.tags.map((tag) => tag.name).join(', ') ?? '';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: expense?.merchant ?? 'Expense' }} />

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
          <ThemedText type="title">{expense.merchant}</ThemedText>

          <View style={styles.actionsRow}>
            <Pressable onPress={handleEdit} style={styles.secondaryButton}>
              <ThemedText type="defaultSemiBold">Edit</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
            >
              <ThemedText type="defaultSemiBold">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Amount</ThemedText>
              <ThemedText>{formattedAmount}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Date</ThemedText>
              <ThemedText>{formattedDate}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Category</ThemedText>
              <ThemedText>{expense.category}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">Currency</ThemedText>
              <ThemedText>{expense.currency}</ThemedText>
            </View>

            <View style={styles.column}>
              <ThemedText type="defaultSemiBold">Tags</ThemedText>
              <ThemedText>{tagLabel || 'No tags'}</ThemedText>
            </View>

            <View style={styles.column}>
              <ThemedText type="defaultSemiBold">Note</ThemedText>
              <ThemedText>{expense.note?.trim() ? expense.note : 'No note'}</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Receipt</ThemedText>

            {expense.receiptName ? (
              <View style={styles.card}>
                <ThemedText type="defaultSemiBold">{expense.receiptName}</ThemedText>
                <ThemedText>{expense.receiptMimeType ?? 'Unknown file type'}</ThemedText>

                {isImageReceipt && expense.receiptUri ? (
                  <Image
                    source={{ uri: expense.receiptUri }}
                    style={styles.receiptPreview}
                    resizeMode="contain"
                  />
                ) : (
                  <ThemedText>No inline preview available for this file type.</ThemedText>
                )}

                <Pressable onPress={handleShareReceipt} style={styles.secondaryButton}>
                  <ThemedText type="defaultSemiBold">Share receipt file</ThemedText>
                </Pressable>
              </View>
            ) : (
              <ThemedText>No receipt attached.</ThemedText>
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
  section: {
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  column: {
    gap: 6,
  },
  receiptPreview: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d88',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
});