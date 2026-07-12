import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listAccountsByPortfolio, listPortfolios, listTransactions } from '../data/wealth.repository';
import type { WealthTransaction } from '../model/wealth.types';

export default function WealthScreen() {
  const db = useSQLiteContext(); const router = useRouter();
  const [transactions, setTransactions] = useState<WealthTransaction[]>([]); const [accountCount, setAccountCount] = useState(0); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { let active = true; void (async () => { setLoading(true); try { const portfolios = await listPortfolios(db); const accounts = await Promise.all(portfolios.map((portfolio) => listAccountsByPortfolio(db, portfolio.id))); const result = await listTransactions(db); if (active) { setTransactions(result); setAccountCount(accounts.flat().length); } } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, [db]));
  return <ThemedView style={styles.container}>{loading ? <View style={styles.centered}><ActivityIndicator /></View> : <ScrollView contentContainerStyle={styles.content}><View style={styles.header}><View style={styles.headerText}><ThemedText type="title">Wealth</ThemedText><ThemedText>Record your portfolio ledger manually. Values and performance arrive in later milestones.</ThemedText></View><Pressable onPress={() => router.push('/wealth/new')} style={styles.add}><ThemedText type="defaultSemiBold">Add</ThemedText></Pressable></View><View style={styles.card}><ThemedText type="defaultSemiBold">Accounts: {accountCount}</ThemedText><ThemedText type="defaultSemiBold">Transactions: {transactions.length}</ThemedText></View><View style={styles.section}><ThemedText type="subtitle">Transaction history</ThemedText>{transactions.length === 0 ? <ThemedText>No transactions yet. Add a contribution before recording purchases.</ThemedText> : transactions.map((item) => <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/wealth/[id]', params: { id: item.id } })}><ThemedText type="defaultSemiBold">{item.type} · {item.tradeDate}</ThemedText><ThemedText>{'amount' in item ? `${item.amount} ${item.currency}` : item.type === 'BUY' || item.type === 'SELL' ? `${item.quantity} units at ${item.unitPrice} ${item.currency}` : 'Unsupported transaction type'}</ThemedText></Pressable>)}</View></ScrollView>}</ThemedView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, centered: { flex: 1, justifyContent: 'center' }, content: { padding: 24, gap: 16 }, header: { flexDirection: 'row', gap: 12 }, headerText: { flex: 1, gap: 8 }, add: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12 }, card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 16, gap: 8 }, section: { gap: 12 } });
