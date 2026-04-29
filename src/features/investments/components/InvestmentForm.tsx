import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTextInput } from '@/src/components/app-text-input';
import type {
  CreateInvestmentCandidateInput,
  InvestmentAssetType,
  InvestmentConviction,
  InvestmentCurrency,
  InvestmentStatus,
} from '../model/investment.types';
import {
  INVESTMENT_ASSET_TYPES,
  INVESTMENT_CONVICTIONS,
  INVESTMENT_CURRENCIES,
  INVESTMENT_STATUSES,
} from '../model/investment.types';

type InvestmentFormInitialValues = {
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  status: InvestmentStatus;
  conviction: InvestmentConviction;
  currency: InvestmentCurrency;
  targetBuyPrice: string;
  referencePrice: string;
  thesis: string;
  riskNotes: string;
};

type InvestmentFormProps = {
  initialValues?: Partial<InvestmentFormInitialValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (input: CreateInvestmentCandidateInput) => Promise<void> | void;
};

const DEFAULT_INITIAL_VALUES: InvestmentFormInitialValues = {
  name: '',
  symbol: '',
  assetType: 'Stock',
  status: 'Researching',
  conviction: 'Medium',
  currency: 'EUR',
  targetBuyPrice: '',
  referencePrice: '',
  thesis: '',
  riskNotes: '',
};

function parseOptionalPositiveNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(',', '.'));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

export function InvestmentForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
}: InvestmentFormProps) {
  const resolvedInitialValues = {
    ...DEFAULT_INITIAL_VALUES,
    ...initialValues,
  };

  const [name, setName] = useState(resolvedInitialValues.name);
  const [symbol, setSymbol] = useState(resolvedInitialValues.symbol);
  const [assetType, setAssetType] = useState<InvestmentAssetType>(
    resolvedInitialValues.assetType
  );
  const [status, setStatus] = useState<InvestmentStatus>(
    resolvedInitialValues.status
  );
  const [conviction, setConviction] = useState<InvestmentConviction>(
    resolvedInitialValues.conviction
  );
  const [currency, setCurrency] = useState<InvestmentCurrency>(
    resolvedInitialValues.currency
  );
  const [targetBuyPrice, setTargetBuyPrice] = useState(
    resolvedInitialValues.targetBuyPrice
  );
  const [referencePrice, setReferencePrice] = useState(
    resolvedInitialValues.referencePrice
  );
  const [thesis, setThesis] = useState(resolvedInitialValues.thesis);
  const [riskNotes, setRiskNotes] = useState(resolvedInitialValues.riskNotes);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const parsedTargetBuyPrice = parseOptionalPositiveNumber(targetBuyPrice);
    const parsedReferencePrice = parseOptionalPositiveNumber(referencePrice);

    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a company, fund, or asset name.');
      return;
    }

    if (Number.isNaN(parsedTargetBuyPrice)) {
      Alert.alert('Invalid target price', 'Please enter a positive target buy price.');
      return;
    }

    if (Number.isNaN(parsedReferencePrice)) {
      Alert.alert('Invalid reference price', 'Please enter a positive reference price.');
      return;
    }

    await onSubmit({
      name: trimmedName,
      symbol,
      assetType,
      status,
      conviction,
      currency,
      targetBuyPrice: parsedTargetBuyPrice,
      referencePrice: parsedReferencePrice,
      thesis,
      riskNotes,
    });
  }

  return (
    <View style={styles.form}>
      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Name</ThemedText>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Microsoft"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Ticker / symbol</ThemedText>
        <AppTextInput
          value={symbol}
          onChangeText={setSymbol}
          placeholder="e.g. MSFT"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Asset type</ThemedText>
        <View style={styles.chips}>
          {INVESTMENT_ASSET_TYPES.map((item) => {
            const isSelected = assetType === item;

            return (
              <Pressable
                key={item}
                onPress={() => setAssetType(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText style={isSelected && styles.chipTextSelected}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Status</ThemedText>
        <View style={styles.chips}>
          {INVESTMENT_STATUSES.map((item) => {
            const isSelected = status === item;

            return (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText style={isSelected && styles.chipTextSelected}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Conviction</ThemedText>
        <View style={styles.chips}>
          {INVESTMENT_CONVICTIONS.map((item) => {
            const isSelected = conviction === item;

            return (
              <Pressable
                key={item}
                onPress={() => setConviction(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText style={isSelected && styles.chipTextSelected}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Currency</ThemedText>
        <View style={styles.chips}>
          {INVESTMENT_CURRENCIES.map((item) => {
            const isSelected = currency === item;

            return (
              <Pressable
                key={item}
                onPress={() => setCurrency(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <ThemedText style={isSelected && styles.chipTextSelected}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Target buy price</ThemedText>
        <AppTextInput
          value={targetBuyPrice}
          onChangeText={setTargetBuyPrice}
          placeholder="Optional"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Manual reference price</ThemedText>
        <AppTextInput
          value={referencePrice}
          onChangeText={setReferencePrice}
          placeholder="Optional"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Investment thesis</ThemedText>
        <AppTextInput
          value={thesis}
          onChangeText={setThesis}
          placeholder="Why is this interesting?"
          multiline
          textAlignVertical="top"
          style={styles.multilineInput}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Risk notes</ThemedText>
        <AppTextInput
          value={riskNotes}
          onChangeText={setRiskNotes}
          placeholder="What could go wrong?"
          multiline
          textAlignVertical="top"
          style={styles.multilineInput}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[styles.submitButton, isSubmitting && styles.disabledButton]}
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
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  multilineInput: {
    minHeight: 110,
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
    borderColor: '#9bbcff',
  },
  chipTextSelected: {
    color: '#111',
  },
  submitButton: {
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