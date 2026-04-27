import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Tag } from '../../tags/model/tag.types';
import type {
  CreateExpenseInput,
  ExpenseAttachment,
  ExpenseCategory,
} from '../model/expense.types';
import { EXPENSE_CATEGORIES } from '../model/expense.types';

type ExpenseFormInitialValues = {
  merchant: string;
  amount: string;
  note: string;
  category: ExpenseCategory;
  date: string;
  receipt: ExpenseAttachment | null;
  selectedTags: Tag[];
};

type ExpenseFormProps = {
  initialValues?: Partial<ExpenseFormInitialValues>;
  availableTags: Tag[];
  submitLabel: string;
  isSubmitting?: boolean;
  isCreatingTag?: boolean;
  onSubmit: (input: CreateExpenseInput) => Promise<void> | void;
  onCreateTag: (name: string) => Promise<Tag>;
};

const DEFAULT_INITIAL_VALUES: ExpenseFormInitialValues = {
  merchant: '',
  amount: '',
  note: '',
  category: 'Other',
  date: new Date().toISOString().slice(0, 10),
  receipt: null,
  selectedTags: [],
};

function isValidExpenseDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

export function ExpenseForm({
  initialValues,
  availableTags,
  submitLabel,
  isSubmitting = false,
  isCreatingTag = false,
  onSubmit,
  onCreateTag,
}: ExpenseFormProps) {
  const resolvedInitialValues: ExpenseFormInitialValues = {
    ...DEFAULT_INITIAL_VALUES,
    ...initialValues,
  };

  const [merchant, setMerchant] = useState(resolvedInitialValues.merchant);
  const [amount, setAmount] = useState(resolvedInitialValues.amount);
  const [note, setNote] = useState(resolvedInitialValues.note);
  const [category, setCategory] = useState<ExpenseCategory>(resolvedInitialValues.category);
  const [date, setDate] = useState(resolvedInitialValues.date);
  const [receipt, setReceipt] = useState<ExpenseAttachment | null>(
    resolvedInitialValues.receipt
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    resolvedInitialValues.selectedTags
  );
  const [newTagName, setNewTagName] = useState('');

  const selectedTagIds = useMemo(
    () => new Set(selectedTags.map((tag) => tag.id)),
    [selectedTags]
  );

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

  function handleToggleTag(tag: Tag) {
    setSelectedTags((current) => {
      const alreadySelected = current.some((item) => item.id === tag.id);

      if (alreadySelected) {
        return current.filter((item) => item.id !== tag.id);
      }

      return [...current, tag];
    });
  }

  async function handleCreateTagPress() {
    const trimmedTagName = newTagName.trim();

    if (!trimmedTagName) {
      Alert.alert('Missing tag name', 'Please enter a tag name.');
      return;
    }

    try {
      const createdTag = await onCreateTag(trimmedTagName);

      setSelectedTags((current) => {
        if (current.some((item) => item.id === createdTag.id)) {
          return current;
        }

        return [...current, createdTag];
      });

      setNewTagName('');
    } catch (error) {
      console.error(error);
      Alert.alert('Tag creation failed', 'Could not create the tag.');
    }
  }

  async function handleSubmit() {
    const trimmedMerchant = merchant.trim();
    const parsedAmount = Number(amount.replace(',', '.'));
    const normalizedDate = date.trim();

    if (!trimmedMerchant) {
      Alert.alert('Missing merchant', 'Please enter a merchant.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive amount.');
      return;
    }

    if (!isValidExpenseDate(normalizedDate)) {
      Alert.alert(
        'Invalid date',
        'Please enter a valid date in the format YYYY-MM-DD.'
      );
      return;
    }

    await onSubmit({
      merchant: trimmedMerchant,
      amount: parsedAmount,
      currency: 'EUR',
      date: normalizedDate,
      category,
      note,
      receiptUri: receipt?.uri,
      receiptName: receipt?.name,
      receiptMimeType: receipt?.mimeType ?? null,
      tagIds: selectedTags.map((tag) => tag.id),
    });
  }

  return (
    <View style={styles.form}>
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
        <ThemedText type="defaultSemiBold">Date</ThemedText>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <ThemedText style={styles.helperText}>
          Use the actual purchase/payment date.
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
        <ThemedText type="defaultSemiBold">Tags</ThemedText>

        <View style={styles.inlineRow}>
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="Create new tag"
            style={[styles.input, styles.inlineInput]}
          />
          <Pressable
            onPress={handleCreateTagPress}
            disabled={isCreatingTag}
            style={[styles.inlineButton, isCreatingTag && styles.disabledButton]}
          >
            <ThemedText type="defaultSemiBold">
              {isCreatingTag ? 'Saving...' : 'Add'}
            </ThemedText>
          </Pressable>
        </View>

        {availableTags.length === 0 ? (
          <ThemedText>No tags created yet.</ThemedText>
        ) : (
          <View style={styles.chips}>
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.has(tag.id);

              return (
                <Pressable
                  key={tag.id}
                  onPress={() => handleToggleTag(tag)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText>{tag.name}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
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
          <ThemedText type="defaultSemiBold">
            {receipt ? 'Replace receipt' : 'Attach receipt'}
          </ThemedText>
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
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[styles.saveButton, isSubmitting && styles.disabledButton]}
      >
        <ThemedText type="defaultSemiBold">
          {isSubmitting ? 'Saving...' : submitLabel}
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
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  inlineButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  disabledButton: {
    opacity: 0.6,
  },
});