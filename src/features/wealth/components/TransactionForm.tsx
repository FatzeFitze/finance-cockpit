import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { AppTextInput } from '@/src/components/app-text-input';
import { parseNonNegativeDecimal } from '../model/decimal';
import type { Account, Asset, CreateWealthTransactionInput } from '../model/wealth.types';

type Props = {
  accounts: Account[];
  assets: Asset[];
  submitLabel: string;
  isSubmitting?: boolean;
  initialValue?: CreateWealthTransactionInput;
  onSubmit: (input: CreateWealthTransactionInput, newAccountName?: string, newAssetName?: string) => Promise<void>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({ accounts, assets, submitLabel, isSubmitting, initialValue, onSubmit }: Props) {
  const initialTrade = initialValue && 'quantity' in initialValue ? initialValue : undefined;
  const initialCash = initialValue && 'amount' in initialValue ? initialValue : undefined;
  const [type, setType] = useState<'CONTRIBUTION' | 'WITHDRAWAL' | 'BUY' | 'SELL'>(initialValue?.type ?? 'CONTRIBUTION');
  const [accountId, setAccountId] = useState(initialValue?.accountId ?? accounts[0]?.id);
  const [assetId, setAssetId] = useState(initialTrade?.assetId ?? assets[0]?.id);
  const [date, setDate] = useState(initialValue?.tradeDate ?? today());
  const [amount, setAmount] = useState(initialCash?.amount ?? '');
  const [quantity, setQuantity] = useState(initialTrade?.quantity ?? '');
  const [unitPrice, setUnitPrice] = useState(initialTrade?.unitPrice ?? '');
  const [fees, setFees] = useState(initialTrade?.fees ?? '0');
  const [taxes, setTaxes] = useState(initialTrade?.taxes ?? '0');
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR');
  const [note, setNote] = useState(initialValue?.note ?? '');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const isTrade = type === 'BUY' || type === 'SELL';

  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Invalid date', 'Use YYYY-MM-DD.');
    if (!accountId && !newAccountName.trim()) return Alert.alert('Select an account', 'Choose an account or enter a new account name.');
    if (isTrade && !assetId && !newAssetName.trim()) return Alert.alert('Select an asset', 'Choose an asset or enter a new asset name.');
    try {
      const base = { accountId: accountId ?? ('' as never), tradeDate: date as never, sequence: 0, currency: currency.trim().toUpperCase() as never, note: note.trim() || undefined, source: 'MANUAL' as const };
      const input: CreateWealthTransactionInput = isTrade
        ? { ...base, type, assetId: assetId ?? ('' as never), quantity: parseNonNegativeDecimal(quantity), unitPrice: parseNonNegativeDecimal(unitPrice), fees: parseNonNegativeDecimal(fees || '0'), taxes: parseNonNegativeDecimal(taxes || '0') }
        : { ...base, type, amount: parseNonNegativeDecimal(amount) };
      await onSubmit(input, newAccountName.trim() || undefined, newAssetName.trim() || undefined);
    } catch {
      Alert.alert('Invalid transaction', 'Enter non-negative canonical amounts, using a dot as the decimal separator.');
    }
  }

  return <View style={styles.form}>
    <View style={styles.chips}>{(['CONTRIBUTION', 'WITHDRAWAL', 'BUY', 'SELL'] as const).map((item) => <Pressable key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.selected]}><ThemedText>{item}</ThemedText></Pressable>)}</View>
    <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
    <ThemedText type="defaultSemiBold">Account</ThemedText>
    <View style={styles.chips}>{accounts.map((item) => <Pressable key={item.id} onPress={() => setAccountId(item.id)} style={[styles.chip, accountId === item.id && styles.selected]}><ThemedText>{item.name}</ThemedText></Pressable>)}</View>
    {!accountId || accounts.length === 0 ? <Field label="New account name" value={newAccountName} onChangeText={setNewAccountName} /> : <Field label="Or create a new account" value={newAccountName} onChangeText={setNewAccountName} />}
    {isTrade ? <><ThemedText type="defaultSemiBold">Asset</ThemedText><View style={styles.chips}>{assets.map((item) => <Pressable key={item.id} onPress={() => setAssetId(item.id)} style={[styles.chip, assetId === item.id && styles.selected]}><ThemedText>{item.name}</ThemedText></Pressable>)}</View><Field label="Or create a new asset" value={newAssetName} onChangeText={setNewAssetName} /><Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" /><Field label="Unit price" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" /><Field label="Fees" value={fees} onChangeText={setFees} keyboardType="decimal-pad" /><Field label="Taxes" value={taxes} onChangeText={setTaxes} keyboardType="decimal-pad" /></> : <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />}
    <Field label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" />
    <Field label="Note (optional)" value={note} onChangeText={setNote} multiline />
    <Pressable disabled={isSubmitting} onPress={() => void submit()} style={[styles.save, isSubmitting && styles.disabled]}><ThemedText type="defaultSemiBold">{isSubmitting ? 'Saving...' : submitLabel}</ThemedText></Pressable>
  </View>;
}

function Field({ label, ...inputProps }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'decimal-pad'; autoCapitalize?: 'characters'; multiline?: boolean }) { return <View style={styles.field}><ThemedText type="defaultSemiBold">{label}</ThemedText><AppTextInput {...inputProps} placeholder={label} /></View>; }

const styles = StyleSheet.create({ form: { gap: 16 }, field: { gap: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10 }, selected: { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' }, save: { borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#e0e7ff' }, disabled: { opacity: 0.5 } });
