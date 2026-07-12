import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardAwareScrollView } from '@/src/components/keyboard-aware-scroll-view';
import { TransactionForm } from '../components/TransactionForm';
import { createAccount, createAsset, createTransaction, ensurePersonalPortfolio, listAccountsByPortfolio, listAssets } from '../data/wealth.repository';
import type { Account, Asset, CreateWealthTransactionInput } from '../model/wealth.types';

export default function NewTransactionScreen() { const db = useSQLiteContext(); const router = useRouter(); const [accounts, setAccounts] = useState<Account[]>([]); const [assets, setAssets] = useState<Asset[]>([]); const [saving, setSaving] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; void (async () => { const portfolio = await ensurePersonalPortfolio(db); const [nextAccounts, nextAssets] = await Promise.all([listAccountsByPortfolio(db, portfolio.id), listAssets(db)]); if (active) { setAccounts(nextAccounts); setAssets(nextAssets); } })(); return () => { active = false; }; }, [db]));
  async function submit(input: CreateWealthTransactionInput, newAccountName?: string, newAssetName?: string) { try { setSaving(true); const portfolio = await ensurePersonalPortfolio(db); const accountId = newAccountName ? await createAccount(db, { portfolioId: portfolio.id, name: newAccountName, baseCurrency: input.currency }) : input.accountId; const assetId = newAssetName ? await createAsset(db, { name: newAssetName, assetType: 'OTHER', bucket: 'SATELLITE', strategyCategory: 'OTHER', tradingCurrency: input.currency }) : ('assetId' in input ? input.assetId : undefined); const id = await createTransaction(db, 'assetId' in input ? { ...input, accountId, assetId: assetId! } : { ...input, accountId }); router.replace({ pathname: '/wealth/[id]', params: { id } }); } catch { Alert.alert('Save failed', 'Could not save the transaction. Check the selected records and fields.'); } finally { setSaving(false); } }
  return <ThemedView style={styles.container}><KeyboardAwareScrollView contentContainerStyle={styles.content}><ThemedText type="title">Add transaction</ThemedText><ThemedText>Enter a contribution, withdrawal, purchase, or sale. New assets use a temporary “Other” classification until classification editing is added.</ThemedText><TransactionForm accounts={accounts} assets={assets} submitLabel="Save transaction" isSubmitting={saving} onSubmit={submit} /></KeyboardAwareScrollView></ThemedView>; }
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 24, gap: 16 } });
