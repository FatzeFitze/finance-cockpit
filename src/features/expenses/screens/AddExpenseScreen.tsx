import * as DocumentPicker from 'expo-document-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createExpense } from '../data/expenses.repository';
import {
  EXPENSE_CATEGORIES,
  type ExpenseAttachment,
  type ExpenseCategory,
} from '../model/expense.types';

export default function AddExpenseScreen() {
  const db = useSQLiteContext();

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [receipt, setReceipt] = useState<ExpenseAttachment | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handlePickReceipt() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      setReceipt({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? null,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Attachment failed', 'Could not pick the receipt.');
    }
  }

  function handleRemoveReceipt() {
    setReceipt(null);
  }

  async function handleSave() {
    const trimmedMerchant = merchant.trim();
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!trimmedMerchant) {
      Alert.alert('Missing merchant', 'Please enter a merchant.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive amount.');
      return;
    }

    try {
      setIsSaving(true);

      await createExpense(db, {
        merchant: trimmedMerchant,
        amount: parsedAmount,
        currency: 'EUR',
        date: new Date().toISOString().slice(0, 10),
        category,
        note,
        receiptUri: receipt?.uri,
        receiptName: receipt?.name,
        receiptMimeType: receipt?.mimeType ?? null,
      });

      setMerchant('');
      setAmount('');
      setNote('');
      setCategory('Other');
      setReceipt(null);

      Alert.alert('Saved', 'Expense saved locally.');
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

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Merchant</ThemedText>
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. Lidl"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Amount (EUR)</ThemedText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 42.35"
            keyboardType="decimal-pad"
            style={styles.input}
          />
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

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Receipt</ThemedText>

          <Pressable onPress={handlePickReceipt} style={styles.secondaryButton}>
            <ThemedText type="defaultSemiBold">Attach receipt</ThemedText>
          </Pressable>

          {receipt ? (
            <View style={styles.attachmentCard}>
              <ThemedText type="defaultSemiBold">{receipt.name}</ThemedText>
              <ThemedText>{receipt.mimeType ?? 'Unknown file type'}</ThemedText>
              <ThemedText numberOfLines={1}>{receipt.uri}</ThemedText>

              <Pressable onPress={handleRemoveReceipt} style={styles.removeButton}>
                <ThemedText>Remove attachment</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ThemedText>No receipt attached.</ThemedText>
          )}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        >
          <ThemedText type="defaultSemiBold">
            {isSaving ? 'Saving...' : 'Save expense'}
          </ThemedText>
        </Pressable>
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  attachmentCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  removeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  saveButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});