import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
    EXPENSE_CATEGORIES,
    type ExpenseCategory,
} from '../../expenses/model/expense.types';
import type { CreateRecurringExpenseInput } from '../model/recurring-expense.types';

type RecurringExpenseFormProps = {
  onSubmit: (input: CreateRecurringExpenseInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function RecurringExpenseForm({
  onSubmit,
  isSubmitting = false,
}: RecurringExpenseFormProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [note, setNote] = useState('');

  async function handleSubmit() {
    const trimmedMerchant = merchant.trim();
    const parsedAmount = Number(amount.replace(',', '.'));
    const parsedDayOfMonth = Number(dayOfMonth);

    if (!trimmedMerchant) {
      Alert.alert('Missing merchant', 'Please enter a merchant.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive amount.');
      return;
    }

    if (
      !Number.isInteger(parsedDayOfMonth) ||
      parsedDayOfMonth < 1 ||
      parsedDayOfMonth > 28
    ) {
      Alert.alert(
        'Invalid day of month',
        'Please enter a whole number between 1 and 28.'
      );
      return;
    }

    await onSubmit({
      merchant: trimmedMerchant,
      amount: parsedAmount,
      currency: 'EUR',
      category,
      note,
      dayOfMonth: parsedDayOfMonth,
    });

    setMerchant('');
    setAmount('');
    setDayOfMonth('1');
    setCategory('Other');
    setNote('');
  }

  return (
    <View style={styles.form}>
      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Merchant</ThemedText>
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Landlord"
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Amount (EUR)</ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 850.00"
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Day of month</ThemedText>
        <TextInput
          value={dayOfMonth}
          onChangeText={setDayOfMonth}
          placeholder="1-28"
          keyboardType="number-pad"
          style={styles.input}
        />
        <ThemedText style={styles.helperText}>
          This simple PoC version supports monthly templates on days 1–28.
        </ThemedText>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Category</ThemedText>
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((item) => {
            const isSelected = item === category;

            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText>{item}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Note</ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
          style={[styles.input, styles.noteInput]}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[styles.saveButton, isSubmitting && styles.disabledButton]}
      >
        <ThemedText type="defaultSemiBold">
          {isSubmitting ? 'Saving...' : 'Create recurring expense'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  helperText: {
    opacity: 0.7,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
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
  saveButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
});