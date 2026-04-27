import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
    canGenerateRecurringExpenseThisMonth,
    formatStoredDateForDisplay,
    getRecurringExpenseDateForCurrentMonth,
    getRecurringExpenseStatusLabel,
    isRecurringExpenseDue,
} from '../model/recurring-expense.logic';
import type { RecurringExpense } from '../model/recurring-expense.types';

type RecurringExpenseListItemProps = {
  recurringExpense: RecurringExpense;
  onGenerate: () => Promise<void> | void;
  onToggleActive: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  isGenerating?: boolean;
  isToggling?: boolean;
  isDeleting?: boolean;
};

export function RecurringExpenseListItem({
  recurringExpense,
  onGenerate,
  onToggleActive,
  onDelete,
  isGenerating = false,
  isToggling = false,
  isDeleting = false,
}: RecurringExpenseListItemProps) {
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: recurringExpense.currency,
  }).format(recurringExpense.amount);

  const currentMonthDate = getRecurringExpenseDateForCurrentMonth(recurringExpense);
  const canGenerate = canGenerateRecurringExpenseThisMonth(recurringExpense);
  const isDue = isRecurringExpenseDue(recurringExpense);

  function handleDeletePress() {
    Alert.alert(
      'Delete recurring expense?',
      `Delete "${recurringExpense.merchant}" permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void onDelete();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">{recurringExpense.merchant}</ThemedText>
        <ThemedText type="defaultSemiBold">{formattedAmount}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText>{recurringExpense.category}</ThemedText>
        <ThemedText>Every month on day {recurringExpense.dayOfMonth}</ThemedText>
      </View>

      <ThemedText>{getRecurringExpenseStatusLabel(recurringExpense)}</ThemedText>
      <ThemedText>
        Current month expense date: {formatStoredDateForDisplay(currentMonthDate)}
      </ThemedText>

      {recurringExpense.note ? (
        <ThemedText style={styles.note}>{recurringExpense.note}</ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            void onGenerate();
          }}
          disabled={!canGenerate || isGenerating}
          style={[
            styles.button,
            isDue && styles.dueButton,
            (!canGenerate || isGenerating) && styles.disabledButton,
          ]}
        >
          <ThemedText type="defaultSemiBold">
            {isGenerating
              ? 'Creating...'
              : canGenerate
                ? 'Create this month'
                : 'Already created'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            void onToggleActive();
          }}
          disabled={isToggling}
          style={[styles.button, isToggling && styles.disabledButton]}
        >
          <ThemedText type="defaultSemiBold">
            {isToggling
              ? 'Updating...'
              : recurringExpense.isActive
                ? 'Pause'
                : 'Activate'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleDeletePress}
          disabled={isDeleting}
          style={[styles.deleteButton, isDeleting && styles.disabledButton]}
        >
          <ThemedText type="defaultSemiBold">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  note: {
    opacity: 0.75,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  button: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dueButton: {
    backgroundColor: '#fff7dd',
  },
  deleteButton: {
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