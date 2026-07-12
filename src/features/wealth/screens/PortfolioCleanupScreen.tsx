import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteLegacyPortfolio, listLegacyPortfolioSummaries, type LegacyPortfolioSummary } from '../data/wealth.repository';

export default function PortfolioCleanupScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const [items, setItems] = useState<LegacyPortfolioSummary[]>([]); const [deletingId, setDeletingId] = useState<string>();
  const load = useCallback(() => { void listLegacyPortfolioSummaries(db).then(setItems).catch(() => Alert.alert('Could not load portfolios', 'Return to Wealth and try again.')); }, [db]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  function confirm(item: LegacyPortfolioSummary) { Alert.alert('Delete legacy portfolio?', `${item.name}\n\nThis permanently deletes ${item.accountCount} account(s), ${item.transactionCount} transaction(s), and ${item.snapshotCount} snapshot(s). Unshared assets and their prices are also removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete portfolio', style: 'destructive', onPress: () => void remove(item) }]); }
  async function remove(item: LegacyPortfolioSummary) { try { setDeletingId(item.id); await deleteLegacyPortfolio(db, item.id); load(); } catch { Alert.alert('Could not delete portfolio', 'No changes were completed. Try again from the Wealth screen.'); } finally { setDeletingId(undefined); } }
  return <ThemedView style={styles.container}><ScrollView contentContainerStyle={styles.content}><ThemedText type="title">Clean up test portfolios</ThemedText><ThemedText>Personal Portfolio remains the only active portfolio. Delete old demos or test portfolios you no longer need.</ThemedText>{items.length === 0 ? <View style={styles.card}><ThemedText>No legacy portfolios found.</ThemedText><Pressable onPress={() => router.replace('/wealth')} style={styles.button}><ThemedText>Back to Wealth</ThemedText></Pressable></View> : items.map((item) => <View key={item.id} style={styles.card}><ThemedText type="defaultSemiBold">{item.name}</ThemedText><ThemedText>{item.accountCount} accounts · {item.transactionCount} transactions · {item.snapshotCount} snapshots</ThemedText><Pressable disabled={deletingId === item.id} onPress={() => confirm(item)} style={[styles.delete, deletingId === item.id && styles.disabled]}><ThemedText>{deletingId === item.id ? 'Deleting…' : 'Delete portfolio'}</ThemedText></Pressable></View>)}</ScrollView></ThemedView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 24, gap: 16 }, card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, gap: 10 }, button: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, alignItems: 'center' }, delete: { borderWidth: 1, borderColor: '#b91c1c', borderRadius: 10, padding: 10, alignItems: 'center' }, disabled: { opacity: 0.5 } });
