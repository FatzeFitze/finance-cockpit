import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardAwareScrollView } from '@/src/components/keyboard-aware-scroll-view';
import { TransactionForm } from '../components/TransactionForm';
import { ensurePersonalPortfolio, getTransactionById, listAccountsByPortfolio, listAssets, updateTransaction } from '../data/wealth.repository';
import type { Account, Asset, CreateWealthTransactionInput, TransactionId, WealthTransaction } from '../model/wealth.types';

export default function EditTransactionScreen() { const db = useSQLiteContext(); const router = useRouter(); const params = useLocalSearchParams<{ id?: string }>(); const [item, setItem] = useState<WealthTransaction | null>(null); const [accounts, setAccounts] = useState<Account[]>([]); const [assets, setAssets] = useState<Asset[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; void (async () => { if (!params.id) return; const [transaction, portfolio, nextAssets] = await Promise.all([getTransactionById(db, params.id as TransactionId), ensurePersonalPortfolio(db), listAssets(db)]); const accounts = await listAccountsByPortfolio(db, portfolio.id); if (active) { setItem(transaction); setAccounts(accounts); setAssets(nextAssets); setLoading(false); } })(); return () => { active = false; }; }, [db, params.id]);
  async function submit(input: CreateWealthTransactionInput) { if (!item) return; try { setSaving(true); await updateTransaction(db, item.id, input); router.replace({ pathname: '/wealth/[id]', params: { id: item.id } }); } catch { Alert.alert('Save failed', 'Could not update the transaction.'); } finally { setSaving(false); } }
  return <ThemedView style={styles.container}>{loading ? <View style={styles.centered}><ActivityIndicator /></View> : !item ? <View style={styles.centered}><ThemedText>Transaction not found.</ThemedText></View> : <KeyboardAwareScrollView contentContainerStyle={styles.content}><ThemedText type="title">Edit transaction</ThemedText><TransactionForm accounts={accounts} assets={assets} initialValue={item as CreateWealthTransactionInput} submitLabel="Save changes" isSubmitting={saving} onSubmit={submit} /></KeyboardAwareScrollView>}</ThemedView>; }
const styles = StyleSheet.create({ container: { flex: 1 }, centered: { flex: 1, justifyContent: 'center', padding: 24 }, content: { padding: 24, gap: 16 } });
